import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// This file is what actually makes this an "AI SDR with memory" instead of
// a wrapper around a template. Any LLM can turn a bio + a recent post into
// a plausible cold email once. What it can't do without this file is know
// that it already emailed this person twice and got silence, or that they
// engaged warmly last time -- context that should change what gets written
// next. `getProspectMemory` is how /api/generate reads that history before
// prompting the model; `logTouch` and `recordReply` are how it writes new
// history back after each send. Everything else here is just plumbing to
// persist that history as JSON on disk.
// ---------------------------------------------------------------------------

export type Touch = {
  date: string; // ISO timestamp of when this touch was sent
  emailSent: string; // the generated email body, verbatim -- lets the model avoid repeating itself
  tone: string; // free-text label the model chose, e.g. "warm-curious", "direct"
  replied: boolean; // did the prospect reply to THIS touch? unknown => false until told otherwise
};

export type ProspectMemory = {
  id: string;
  name: string;
  company: string;
  touches: Touch[];
};

type MemoryStore = {
  prospects: ProspectMemory[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORY_PATH = path.join(DATA_DIR, "memory.json");
const SEED_PATH = path.join(DATA_DIR, "memory.example.json");

const EMPTY_STORE: MemoryStore = { prospects: [] };

/**
 * Loads the on-disk store, creating it on first run.
 *
 * `data/memory.json` is gitignored -- it's runtime state that grows as the
 * demo runs, not source. `data/memory.example.json` IS committed, purely to
 * document the shape and (as a bonus) to give a fresh checkout a couple of
 * prospects with real history already in it, so the tone-shift behavior is
 * visible on the very first demo run instead of requiring two live sends.
 */
async function readStore(): Promise<MemoryStore> {
  try {
    const raw = await readFile(MEMORY_PATH, "utf-8");
    return JSON.parse(raw) as MemoryStore;
  } catch (err) {
    if (isNotFound(err)) {
      const seeded = await loadSeed();
      await writeStore(seeded);
      return seeded;
    }
    // Corrupt/unreadable JSON shouldn't take the whole app down -- log it
    // and fall back to an empty store so generation can still proceed
    // (just without history for this run).
    console.error("[memory] failed to read memory.json, starting fresh:", err);
    return EMPTY_STORE;
  }
}

async function loadSeed(): Promise<MemoryStore> {
  try {
    const raw = await readFile(SEED_PATH, "utf-8");
    return JSON.parse(raw) as MemoryStore;
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(store: MemoryStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MEMORY_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Look up everything we remember about a prospect by name. Returns
 * `undefined` for a prospect we've never touched -- that's the signal
 * /api/generate uses to write a cold-open email instead of a follow-up.
 */
export async function getProspectMemory(name: string): Promise<ProspectMemory | undefined> {
  const store = await readStore();
  return store.prospects.find((p) => normalize(p.name) === normalize(name));
}

export type LogTouchInput = {
  company: string; // captured on the touch in case this is the prospect's first one
  emailSent: string;
  tone: string;
  replied?: boolean; // defaults to false -- we don't know yet at send time
};

/**
 * Appends a new touch to a prospect's history, creating the prospect record
 * if this is their first one. Returns the updated record.
 */
export async function logTouch(name: string, touch: LogTouchInput): Promise<ProspectMemory> {
  const store = await readStore();
  const newTouch: Touch = {
    date: new Date().toISOString(),
    emailSent: touch.emailSent,
    tone: touch.tone,
    replied: touch.replied ?? false,
  };

  const existing = store.prospects.find((p) => normalize(p.name) === normalize(name));
  let updated: ProspectMemory;

  if (existing) {
    existing.touches.push(newTouch);
    updated = existing;
  } else {
    updated = {
      id: randomUUID(),
      name,
      company: touch.company,
      touches: [newTouch],
    };
    store.prospects.push(updated);
  }

  await writeStore(store);
  return updated;
}

/**
 * Marks whether the prospect replied to their most recent touch. This is
 * what powers the "Simulate reply" / "Simulate no reply" demo buttons in
 * Stage 5: flip this, then generate a follow-up, and the prompt sees a
 * different history than it did a second ago.
 */
export async function recordReply(name: string, replied: boolean): Promise<ProspectMemory | undefined> {
  const store = await readStore();
  const prospect = store.prospects.find((p) => normalize(p.name) === normalize(name));
  if (!prospect || prospect.touches.length === 0) return undefined;

  prospect.touches[prospect.touches.length - 1].replied = replied;
  await writeStore(store);
  return prospect;
}
