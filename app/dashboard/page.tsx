"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { MotionButton } from "@/components/motion-button";
import { ProspectCard } from "@/components/prospect-card";
import { ResultCard } from "@/components/result-card";
import { MAX_PROSPECTS, type GenerationResult, type Prospect } from "@/lib/types";
import { EASE } from "@/lib/motion";

function createEmptyProspect(): Prospect {
  return {
    id: crypto.randomUUID(),
    name: "",
    company: "",
    bio: "",
    recentPost: "",
    companyNews: "",
  };
}

// A prospect is "ready" once it has what the generation prompt (Stage 4)
// actually needs to ground an email in something real. Company news stays
// optional -- not every prospect will have recent news, and the prompt is
// written to work fine without it.
function isComplete(prospect: Prospect) {
  return Boolean(
    prospect.name.trim() && prospect.company.trim() && prospect.bio.trim() && prospect.recentPost.trim()
  );
}

// Calls /api/generate for exactly one prospect. The dashboard always sends
// a single-item array -- Stage 4's endpoint is happy to take a batch, but
// firing one request per prospect (instead of one request for all of them)
// is what lets each card resolve on its own instead of all popping in at
// once behind a single blocking spinner.
async function generateOne(prospect: Prospect): Promise<{ email?: string; tone?: string; error?: string }> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospects: [prospect] }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Something went wrong generating this email." };
    const result = data.results?.[0];
    if (!result) return { error: "No result returned." };
    if (result.error) return { error: result.error };
    return { email: result.email, tone: result.tone };
  } catch {
    return { error: "Network error — is the dev server running?" };
  }
}

export default function DashboardPage() {
  // Lazy initializer: crypto.randomUUID() is impure, and a lazy `useState`
  // initializer is the one place React guarantees it runs exactly once
  // per mount.
  const [prospects, setProspects] = useState<Prospect[]>(() => [createEmptyProspect()]);
  const [results, setResults] = useState<Record<string, GenerationResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addProspect = () => {
    setProspects((prev) => (prev.length >= MAX_PROSPECTS ? prev : [...prev, createEmptyProspect()]));
  };

  const removeProspect = (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
    setResults((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateProspect = (id: string, field: keyof Omit<Prospect, "id">, value: string) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const canGenerate = prospects.length > 0 && prospects.every(isComplete);

  const handleGenerate = () => {
    setIsSubmitting(true);
    setResults((prev) => {
      const next = { ...prev };
      prospects.forEach((p) => (next[p.id] = { status: "loading" }));
      return next;
    });

    // Each task updates its own card the moment it resolves -- no awaiting
    // the whole batch before anything renders.
    const tasks = prospects.map(async (prospect) => {
      const outcome = await generateOne(prospect);
      setResults((prev) => ({
        ...prev,
        [prospect.id]: outcome.error
          ? { status: "error", error: outcome.error }
          : { status: "done", email: outcome.email, tone: outcome.tone },
      }));
    });

    Promise.allSettled(tasks).then(() => setIsSubmitting(false));
  };

  // "Simulate reply" / "Simulate no reply": record the outcome of the last
  // touch, then generate again -- the new call reads updated memory, so the
  // tone visibly shifts (warmer after a reply, more direct after silence).
  // This is the whole "memory" pitch, demoable live without a real inbox.
  const handleSimulate = async (prospect: Prospect, replied: boolean) => {
    setResults((prev) => ({ ...prev, [prospect.id]: { status: "loading" } }));

    const replyRes = await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: prospect.name, replied }),
    });

    if (!replyRes.ok) {
      const data = await replyRes.json().catch(() => ({}));
      setResults((prev) => ({
        ...prev,
        [prospect.id]: { status: "error", error: data.error ?? "Could not record the reply." },
      }));
      return;
    }

    const outcome = await generateOne(prospect);
    setResults((prev) => ({
      ...prev,
      [prospect.id]: outcome.error
        ? { status: "error", error: outcome.error }
        : { status: "done", email: outcome.email, tone: outcome.tone },
    }));
  };

  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      {/* Arrival animation for the header block -- makes landing on this
          page (especially via the Get started wipe transition) feel like it
          arrived on purpose rather than just popping into place. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      >
        <Link href="/" className="font-heading text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300">
          ← Cadence
        </Link>

        <header className="mt-6 mb-10">
          <p className="text-sm font-medium tracking-wide text-teal-400 uppercase">Dashboard</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-white">Add your prospects</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Paste what you already know about each prospect, their bio, a recent post, any company news.
            The more specific the input, the more specific the email.
          </p>
        </header>
      </motion.div>

      <div className="flex flex-col gap-6">
        <AnimatePresence>
          {prospects.map((prospect, index) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              index={index}
              onChange={updateProspect}
              onRemove={removeProspect}
              canRemove={prospects.length > 1}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-8">
        <div className="flex items-center gap-3">
          <MotionButton
            type="button"
            onClick={addProspect}
            disabled={prospects.length >= MAX_PROSPECTS}
            className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add prospect
          </MotionButton>
          <span className="text-sm text-zinc-500">
            {prospects.length}/{MAX_PROSPECTS} prospects
          </span>
        </div>

        <MotionButton
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || isSubmitting}
          title={canGenerate ? undefined : "Fill in name, company, bio, and a recent post for every prospect"}
          className="rounded-full bg-teal-400 px-8 py-3 text-sm font-semibold text-black shadow-[0_0_20px_-4px_rgba(45,212,191,0.5)] transition-all hover:bg-teal-300 hover:shadow-[0_0_30px_-2px_rgba(45,212,191,0.65)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
        >
          {isSubmitting ? "Generating..." : "Generate emails"}
        </MotionButton>
      </div>

      {hasResults && (
        <div className="mt-16">
          <h2 className="mb-6 font-heading text-xl font-bold tracking-tight text-white">Generated emails</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {prospects
              .filter((p) => results[p.id])
              .map((prospect) => (
                <ResultCard
                  key={prospect.id}
                  prospect={prospect}
                  result={results[prospect.id]}
                  onSimulate={(replied) => handleSimulate(prospect, replied)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
