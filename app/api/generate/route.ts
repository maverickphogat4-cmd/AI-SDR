import { NextResponse } from "next/server";
import {
  FinishReason,
  GoogleGenerativeAI,
  GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type GenerativeModel,
  type ResponseSchema,
} from "@google/generative-ai";
import { getProspectMemory, logTouch, type ProspectMemory } from "@/lib/memory";
import type { Prospect } from "@/lib/types";

// Gemini for now (free tier). "gemini-1.5-flash" -- the model actually
// named in this task -- returns a 404 (retired from the generateContent
// API; confirmed live against models.list for this key), so this points at
// Google's own "gemini-flash-latest" alias instead: it always resolves to
// whatever the current stable fast/free-tier-friendly flash model is,
// which is what "gemini-1.5-flash" was actually standing in for here.
// Avoids pinning to a specific version number that will just go stale
// again the same way.
//
// Nothing else in this file is Gemini-specific by design:
// buildUserPrompt/isValidProspect/the route handler's shape are
// provider-agnostic, so swapping to a different model provider later is a
// matter of rewriting generateEmail + describeError against a different
// SDK, not a rewrite of this whole route.
const MODEL = "gemini-flash-latest";

// This is the one place the "memory" pitch actually shows up in the output:
// the model is told, in plain language, to write a different email depending
// on what lib/memory.ts remembers about this prospect. Everything upstream
// (the form, the JSON store) exists to feed this instruction.
const SYSTEM_INSTRUCTION = `You are an SDR (sales development rep) writing cold outreach emails on behalf of the user. Every email must:
- Be 3-4 sentences and stay under about 120 words total, plain text -- no signature block. Keep it short on purpose: brevity here also keeps you well clear of the response length limit.
- Reference exactly ONE specific, concrete fact drawn from the prospect's bio, their recent post, or the company news -- name the actual detail (what the post was actually about, the specific news item, etc.), not a vague paraphrase. Pick whichever fact is most specific and recent. Do not reference more than one fact, and never invent a fact that wasn't given to you.
- Sound human and specific, not like a generic template: no "I hope this email finds you well", no "reaching out because", no "synergy", no exclamation-point enthusiasm, no filler.
- End with a single, low-friction ask (a short question or a 15-minute chat), not a hard pitch.
- Include a short, specific subject line (not generic like "Quick question").

If touch history is provided, you MUST let it change the tone -- this is the whole point:
- No prior touches: warm and curious. This is a first impression.
- Prior touch(es) with no reply: more direct and brief. Briefly acknowledge this is a follow-up (without sounding passive-aggressive) and get to the point faster than the first email did.
- Prior touch(es) where they replied: warmer and more familiar. Write like someone continuing a conversation, not starting cold again.

Output ONLY the requested JSON -- no preamble, no "Here's an email:" wrapper, no markdown formatting. Respond with the "subject" line, the "tone" label you used (1-3 words, e.g. "warm-curious", "direct", "warm-familiar"), and the "email" body, matching the provided schema.`;

// Gemini's structured-output equivalent of the strict JSON schema the
// Anthropic version of this route used -- responseMimeType +
// responseSchema together guarantee the response parses, no
// regex/retry-on-malformed loop needed.
const EMAIL_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: {
      type: SchemaType.STRING,
      description: "Short, specific subject line -- not generic like 'Quick question'.",
    },
    tone: {
      type: SchemaType.STRING,
      description: "1-3 word label for the tone used, e.g. 'warm-curious', 'direct', 'warm-familiar'.",
    },
    email: {
      type: SchemaType.STRING,
      description: "The full email body, 3-4 sentences, no subject line or signature.",
    },
  },
  required: ["subject", "tone", "email"],
};

// Free-tier "the model is overloaded" 503s (and their 429 rate-limit
// cousin) are transient -- the same request usually succeeds a second or
// two later. withRetry() below is what actually retries; this stagger is
// what keeps a batch from manufacturing that overload in the first place
// by not sending every prospect's request in the same instant.
const STAGGER_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 503 ("model overloaded") and 429 (rate limited) are the two Gemini
// free-tier errors worth retrying -- both clear up on their own within a
// few seconds. Matched by status when the SDK gives us one
// (GoogleGenerativeAIFetchError), and by message text as a fallback since
// not every overload surfaces with a typed status.
function isRetryableError(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIFetchError && (err.status === 503 || err.status === 429)) {
    return true;
  }
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    message.includes("overloaded") ||
    message.includes("rate limit") ||
    message.includes("503") ||
    message.includes("429")
  );
}

// Retries a transient Gemini failure with exponential backoff (1s, 2s,
// 4s) before giving up -- up to 3 retries beyond the initial attempt, 4
// tries total. Non-retryable errors (bad key, blocked prompt, malformed
// response, ...) skip straight to the throw so those fail fast instead of
// wasting 7s retrying something backoff can't fix.
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries || !isRetryableError(err)) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

type GenerateRequestBody = {
  prospects?: Prospect[];
};

type GeneratedEmail = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  tone: string | null;
  error: string | null;
};

function isValidProspect(value: unknown): value is Prospect {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    typeof p.company === "string" &&
    p.company.trim().length > 0 &&
    typeof p.bio === "string" &&
    typeof p.recentPost === "string" &&
    typeof p.companyNews === "string"
  );
}

function buildUserPrompt(prospect: Prospect, memory: ProspectMemory | undefined): string {
  const lines = [
    `Prospect: ${prospect.name}, ${prospect.company}`,
    `Bio: ${prospect.bio}`,
    `Recent LinkedIn post: ${prospect.recentPost}`,
  ];

  if (prospect.companyNews.trim()) {
    lines.push(`Recent company news: ${prospect.companyNews}`);
  }

  if (memory && memory.touches.length > 0) {
    lines.push("", "Touch history with this prospect (oldest first):");
    memory.touches.forEach((touch, i) => {
      lines.push(
        `${i + 1}. ${touch.date.slice(0, 10)} — tone used: ${touch.tone} — replied: ${touch.replied ? "yes" : "no"}`
      );
    });
  } else {
    lines.push("", "No prior touch history with this prospect — this is a first email.");
  }

  return lines.join("\n");
}

async function generateEmail(
  model: GenerativeModel,
  prospect: Prospect,
  memory: ProspectMemory | undefined
): Promise<{ tone: string; email: string }> {
  const result = await model.generateContent(buildUserPrompt(prospect, memory));
  const response = result.response;

  // A blocked prompt shows up here rather than as a thrown error -- check
  // before touching candidates/text() at all.
  if (response.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked this request (${response.promptFeedback.blockReason}).`);
  }

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  // Each of these gets its own distinct message -- the point is that "cut
  // off" only ever fires for a genuine MAX_TOKENS, not as a catch-all for
  // every other way an empty/malformed response can show up below.
  if (finishReason === FinishReason.MAX_TOKENS) {
    throw new Error("Response was cut off before finishing, try again.");
  }
  if (
    finishReason === FinishReason.SAFETY ||
    finishReason === FinishReason.RECITATION ||
    finishReason === FinishReason.PROHIBITED_CONTENT
  ) {
    throw new Error("Gemini declined to generate this email.");
  }
  if (!candidate) {
    throw new Error("Gemini returned no result for this prospect, try again.");
  }

  let text: string;
  try {
    text = response.text();
  } catch (err) {
    // EnhancedGenerateContentResponse.text() itself throws for a couple of
    // response shapes not already covered by the checks above -- surface
    // its own message rather than letting it propagate unlabeled.
    throw new Error(err instanceof Error ? err.message : "Gemini returned an unreadable response, try again.");
  }
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response, try again.");
  }

  let parsed: { subject: string; tone: string; email: string };
  try {
    parsed = JSON.parse(text) as { subject: string; tone: string; email: string };
  } catch {
    // Distinct from the MAX_TOKENS message above: this is a genuinely
    // malformed (but non-truncated, per finishReason) response, not a
    // length problem -- telling the user "cut off" here would be wrong.
    throw new Error("Gemini's response wasn't valid JSON, try again.");
  }

  // Fold the subject line into the single `email` string the frontend
  // already renders (whitespace-pre-wrap, see components/result-card.tsx) --
  // no new field on the wire, the existing GeneratedEmail/GenerationResult
  // shape stays exactly as the dashboard already expects it.
  const email = `Subject: ${parsed.subject}\n\n${parsed.email}`;
  return { tone: parsed.tone, email };
}

function describeError(err: unknown): string {
  if (err instanceof GoogleGenerativeAIFetchError) {
    if (err.status === 400 || err.status === 401 || err.status === 403) {
      return "Gemini API key was rejected — check GEMINI_API_KEY in .env.local.";
    }
    if (err.status === 429) {
      return "Rate limited by the Gemini API (free tier), wait a moment and try again.";
    }
    if (err.status === 503) {
      // Common in practice on the free tier -- confirmed live during
      // testing, not just a theoretical case -- so it gets its own message
      // rather than falling into the generic bucket below. By the time this
      // fires, withRetry() has already silently retried 3 times with
      // backoff, so this is the "even that didn't work" message, not the
      // first sign of trouble.
      return "High demand on the free tier right now — retried automatically but it's still overloaded. Wait a few seconds and try again.";
    }
    return `Gemini API error (${err.status ?? "unknown"}): ${err.message}`;
  }
  if (err instanceof GoogleGenerativeAIError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unknown error generating this email.";
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const prospects = body.prospects;
  if (!Array.isArray(prospects) || prospects.length === 0) {
    return NextResponse.json({ error: "Provide at least one prospect." }, { status: 400 });
  }
  if (!prospects.every(isValidProspect)) {
    return NextResponse.json(
      { error: "Each prospect needs id, name, company, bio, recentPost, and companyNews." },
      { status: 400 }
    );
  }

  // Fail fast for the whole request rather than letting every prospect hit
  // the same "no key" error individually -- one clear message beats N copies.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing GEMINI_API_KEY. Add it to .env.local (not committed to git) and restart the dev server.",
      },
      { status: 500 }
    );
  }

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: EMAIL_RESPONSE_SCHEMA,
      // Generous relative to the actual output (a short email is maybe a
      // couple hundred tokens of JSON, and SYSTEM_INSTRUCTION now tells the
      // model to stay under ~120 words): this model version reasons
      // internally before answering (confirmed via a raw API call --
      // responses carry a thoughtSignature), and those tokens count against
      // this same budget. That reasoning pass varies in length per prompt,
      // so 2048 wasn't a safe ceiling -- it truncated on some prospects
      // (reported live) even though the actual email text is tiny. This SDK
      // doesn't expose a way to cap/disable the reasoning itself (checked
      // its type defs -- no thinkingConfig), so the fix is headroom.
      maxOutputTokens: 4096,
    },
  });

  // Independent per-prospect try/catch: one prospect hitting a refusal or a
  // transient API error shouldn't take down emails that were generating
  // fine. Still run concurrently -- these are independent requests to the
  // API -- but staggered: kicking every prospect off in the same instant
  // (the old plain Promise.all) is exactly what was tripping the free
  // tier's "model overloaded" 503s, so each prospect's turn waits
  // index * STAGGER_MS before starting. Errors per prospect (including
  // "retries exhausted") are still isolated to that prospect's own result.
  const results: GeneratedEmail[] = await Promise.all(
    prospects.map(async (prospect, index): Promise<GeneratedEmail> => {
      try {
        if (index > 0) await sleep(index * STAGGER_MS);
        const memory = await getProspectMemory(prospect.name);
        const { tone, email } = await withRetry(() => generateEmail(model, prospect, memory));

        // Log the touch *after* a successful generation -- a failed attempt
        // shouldn't pollute history with an email that was never actually sent.
        await logTouch(prospect.name, { company: prospect.company, emailSent: email, tone });

        return { id: prospect.id, name: prospect.name, company: prospect.company, email, tone, error: null };
      } catch (err) {
        return {
          id: prospect.id,
          name: prospect.name,
          company: prospect.company,
          email: null,
          tone: null,
          error: describeError(err),
        };
      }
    })
  );

  return NextResponse.json({ results });
}
