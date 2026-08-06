"use client";

import Link from "next/link";
import { useState } from "react";
import { ProspectCard } from "@/components/prospect-card";
import { MAX_PROSPECTS, type Prospect } from "@/lib/types";

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

export default function DashboardPage() {
  // Lazy initializer: crypto.randomUUID() is impure, and a lazy `useState`
  // initializer is the one place React guarantees it runs exactly once
  // per mount (see the same pattern/reasoning in components/hero-scene.tsx).
  const [prospects, setProspects] = useState<Prospect[]>(() => [createEmptyProspect()]);

  const addProspect = () => {
    setProspects((prev) => (prev.length >= MAX_PROSPECTS ? prev : [...prev, createEmptyProspect()]));
  };

  const removeProspect = (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProspect = (id: string, field: keyof Omit<Prospect, "id">, value: string) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const canGenerate = prospects.length > 0 && prospects.every(isComplete);

  const handleGenerate = () => {
    // Placeholder for now -- Stage 4 adds POST /api/generate and Stage 5
    // wires this button up to call it and render results below.
    console.log("Ready to generate emails for:", prospects);
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        ← AI SDR with Memory
      </Link>

      <header className="mt-6 mb-10">
        <p className="text-sm font-medium tracking-wide text-teal-400 uppercase">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Add your prospects</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Paste what you already know about each prospect -- their bio, a recent post, any company news.
          The more specific the input, the more specific the email.
        </p>
      </header>

      <div className="flex flex-col gap-6">
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
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addProspect}
            disabled={prospects.length >= MAX_PROSPECTS}
            className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add prospect
          </button>
          <span className="text-sm text-zinc-500">
            {prospects.length}/{MAX_PROSPECTS} prospects
          </span>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          title={canGenerate ? undefined : "Fill in name, company, bio, and a recent post for every prospect"}
          className="rounded-full bg-teal-400 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Generate emails
        </button>
      </div>
    </div>
  );
}
