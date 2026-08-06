// Shared shapes used across the dashboard form, the memory layer, and the
// /api/generate route -- kept in one place so all three agree on what a
// "prospect" looks like as the app grows across stages.

export type Prospect = {
  id: string;
  name: string;
  company: string;
  bio: string; // LinkedIn "About" section or a pasted summary
  recentPost: string; // Text of a recent LinkedIn post -- the main hook for personalization
  companyNews: string; // Optional: funding, launches, press. Empty string if not provided.
};

export const MAX_PROSPECTS = 10;

// Per-prospect state for a generated email, keyed by prospect id on the
// dashboard. Each card owns its own status so cards resolve independently
// instead of behind one blocking spinner for the whole batch.
export type GenerationStatus = "loading" | "done" | "error";

export type GenerationResult = {
  status: GenerationStatus;
  email?: string;
  tone?: string;
  error?: string;
};
