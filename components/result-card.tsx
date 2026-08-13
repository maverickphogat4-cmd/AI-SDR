"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { MotionButton } from "@/components/motion-button";
import { EASE } from "@/lib/motion";
import type { GenerationResult, Prospect } from "@/lib/types";

type ResultCardProps = {
  prospect: Prospect;
  result: GenerationResult;
  onSimulate: (replied: boolean) => void;
};

const SECONDARY_BUTTON =
  "rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

/** One generated email, with the copy + simulate-reply controls that let a
 * judge watch the tone shift live without waiting on a real reply. Same
 * solid-ish dark glass treatment as ProspectCard (bg-black/60 +
 * backdrop-blur-md) -- see that file's doc comment for why, over a moving
 * background this needs more than the landing page's bg-white/5. */
export function ResultCard({ prospect, result, onSimulate }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const isLoading = result.status === "loading";
  const isDone = result.status === "done" && Boolean(result.email);

  const handleCopy = async () => {
    if (!result.email) return;
    await navigator.clipboard.writeText(result.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-md transition-colors hover:border-white/20"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{prospect.name}</h3>
          <p className="mt-0.5 text-sm text-zinc-500">{prospect.company}</p>
        </div>
        {result.tone && (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium whitespace-nowrap text-emerald-300">
            {result.tone}
          </span>
        )}
      </div>

      <div className="flex-1">
        {isLoading && <EmailSkeleton />}

        {result.status === "error" && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {result.error}
          </p>
        )}

        {isDone && <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">{result.email}</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <MotionButton type="button" onClick={handleCopy} disabled={!isDone} className={SECONDARY_BUTTON}>
          {copied ? "Copied" : "Copy"}
        </MotionButton>
        <MotionButton
          type="button"
          onClick={() => onSimulate(true)}
          disabled={!isDone}
          className="rounded-full border border-emerald-700/60 px-4 py-1.5 text-xs font-medium text-emerald-300 shadow-[0_0_0px_rgba(16,185,129,0)] transition-all hover:border-emerald-500 hover:text-emerald-200 hover:shadow-[0_0_16px_-2px_rgba(16,185,129,0.45)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          Simulate reply
        </MotionButton>
        <MotionButton type="button" onClick={() => onSimulate(false)} disabled={!isDone} className={SECONDARY_BUTTON}>
          Simulate no reply
        </MotionButton>
      </div>
    </motion.div>
  );
}

// A shape-matched skeleton (four lines, tapering) reads as "an email is
// coming" rather than a generic bar -- small detail, cheap to get right.
function EmailSkeleton() {
  return (
    <div className="animate-pulse space-y-2.5">
      <div className="h-3 w-full rounded bg-white/10" />
      <div className="h-3 w-11/12 rounded bg-white/10" />
      <div className="h-3 w-4/5 rounded bg-white/10" />
      <div className="h-3 w-2/3 rounded bg-white/10" />
    </div>
  );
}
