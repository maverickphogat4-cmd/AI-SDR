import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getProspectMemory, logTouch, type ProspectMemory } from "@/lib/memory";
import type { Prospect } from "@/lib/types";

// Not the newest Anthropic API you know -- see the claude-api skill / AGENTS.md.
// claude-opus-5 with structured outputs (output_config.format) and adaptive
// thinking left on (we only tune `effort`, never disable thinking -- see the
// comment on generateEmail below for why that matters here specifically).
const MODEL = "claude-opus-5";

// This is the one place the "memory" pitch actually shows up in the output:
// the model is told, in plain language, to write a different email depending
// on what lib/memory.ts remembers about this prospect. Everything upstream
// (the form, the JSON store) exists to feed this instruction.
const SYSTEM_PROMPT = `You are an SDR (sales development rep) writing cold outreach emails on behalf of the user. Every email must:
- Be 3-4 sentences, plain text -- no subject line, no signature block.
- Reference exactly ONE specific fact drawn from the prospect's bio, their recent post, or the company news -- pick whichever is most specific and recent. Do not reference more than one fact, and never invent a fact that wasn't given to you.
- Avoid generic sales language: no "I hope this email finds you well", no "reaching out because", no "synergy", no exclamation-point enthusiasm.
- End with a single, low-friction ask (a short question or a 15-minute chat), not a hard pitch.

If touch history is provided, you MUST let it change the tone -- this is the whole point:
- No prior touches: warm and curious. This is a first impression.
- Prior touch(es) with no reply: more direct. Briefly acknowledge this is a follow-up (without sounding passive-aggressive) and get to the point faster than the first email did.
- Prior touch(es) where they replied: warmer and more familiar. Write like someone continuing a conversation, not starting cold again.

Respond with the "tone" label you used (1-3 words, e.g. "warm-curious", "direct", "warm-familiar") and the "email" body, matching the provided schema.`;

// additionalProperties: false + required is what makes this a *strict*
// schema -- the response is guaranteed to parse, no regex/retry-on-malformed
// loop needed.
const EMAIL_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    tone: {
      type: "string" as const,
      description: "1-3 word label for the tone used, e.g. 'warm-curious', 'direct', 'warm-familiar'.",
    },
    email: {
      type: "string" as const,
      description: "The full email body, 3-4 sentences, no subject line or signature.",
    },
  },
  required: ["tone", "email"],
  additionalProperties: false,
};

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
        `${i + 1}. ${touch.date.slice(0, 10)} -- tone used: ${touch.tone} -- replied: ${touch.replied ? "yes" : "no"}`
      );
    });
  } else {
    lines.push("", "No prior touch history with this prospect -- this is a first email.");
  }

  return lines.join("\n");
}

// Deliberately not disabling thinking here, even though these are short,
// simple generations. On Claude Opus 5, disabled thinking has two documented
// failure modes -- tool calls leaking into plain text, and <thinking> tags
// leaking into the visible response -- and the second one would corrupt the
// structured-output JSON we're relying on below. Leaving thinking on
// (adaptive, the default) and dialing `effort` down to "low" gets the same
// latency win without that risk.
async function generateEmail(
  client: Anthropic,
  prospect: Prospect,
  memory: ProspectMemory | undefined
): Promise<{ tone: string; email: string }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: EMAIL_OUTPUT_SCHEMA },
    },
    messages: [{ role: "user", content: buildUserPrompt(prospect, memory) }],
  });

  // Claude Opus 5 runs elevated safety classifiers and can decline a request
  // outright (HTTP 200, not an error) -- always check stop_reason before
  // trusting `content`.
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to generate this email.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Response was cut off before finishing, try again.");
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("Model returned no text content.");
  }

  const parsed = JSON.parse(textBlock.text) as { tone: string; email: string };
  return parsed;
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Anthropic API key was rejected — check ANTHROPIC_API_KEY in .env.local.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the Anthropic API, wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error (${err.status ?? "unknown"}): ${err.message}`;
  }
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing ANTHROPIC_API_KEY. Add it to .env.local (not committed to git) and restart the dev server.",
      },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  // Independent per-prospect try/catch: one prospect hitting a refusal or a
  // transient API error shouldn't take down emails that were generating
  // fine. Run concurrently -- these are independent requests to the API.
  const results: GeneratedEmail[] = await Promise.all(
    prospects.map(async (prospect): Promise<GeneratedEmail> => {
      try {
        const memory = await getProspectMemory(prospect.name);
        const { tone, email } = await generateEmail(client, prospect, memory);

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
