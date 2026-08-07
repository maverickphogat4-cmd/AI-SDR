"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EASE } from "@/lib/motion";

const BOOT_SEEN_KEY = "cadence-boot-seen";
const FALLBACK_MS = 4000; // don't strand anyone behind a black screen if the video never fires onEnded
const EXIT_DURATION_S = 0.35;

// `useSyncExternalStore` plumbing for "has this session already seen the
// boot". There's nothing to actually subscribe to -- we only ever read this
// once, right after hydration -- but the hook still gives us the safe
// "render the server value first, then correct to the real client value"
// behavior for free, without a setState-in-effect footgun (see the same
// pattern for prefers-reduced-motion in components/hero-scene.tsx).
function subscribeToBootSeen() {
  return () => {};
}
function getBootSeenSnapshot(): boolean {
  try {
    return sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked (private mode, etc.) -- fail open, skip the boot
  }
}
function getBootSeenServerSnapshot(): boolean {
  // No sessionStorage during SSR. Reporting "seen" here means the server
  // (and the very first client paint, before React corrects it) renders
  // nothing -- hydration-safe -- and the real answer takes over a frame
  // later if it turns out to actually be unseen.
  return true;
}

type Stage = "playing" | "exiting" | "done";

export function BootIntro() {
  const seen = useSyncExternalStore(subscribeToBootSeen, getBootSeenSnapshot, getBootSeenServerSnapshot);
  const [stage, setStage] = useState<Stage>("playing");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable identities (useCallback) so the effect below can list them as
  // dependencies without re-running on every render.
  const clearFallback = useCallback(() => {
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearFallback();
    setStage((s) => (s === "playing" ? "exiting" : s));
  }, [clearFallback]);

  // playbackRate + fallback timer. Runs whenever we're actually in the
  // "playing" stage for a session that hasn't seen the boot.
  useEffect(() => {
    if (seen || stage !== "playing") return;

    // playbackRate isn't a JSX prop -- has to be set imperatively once the
    // element exists, per the video element's own API.
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0;
    }

    fallbackTimer.current = setTimeout(finish, FALLBACK_MS);
    return clearFallback;
  }, [seen, stage, finish, clearFallback]);

  // Mark the session as "seen" only once the sequence actually concludes --
  // deliberately NOT proactively at mount. Writing at mount is what breaks
  // under React Strict Mode's dev-only double-invoke (mount -> run effects
  // -> unmount -> mount again, to catch non-idempotent effects): the first
  // pass's write would already be sitting in sessionStorage by the time the
  // second, real pass re-checks `seen`, making it think the boot had
  // already played and skip it outright. Writing here instead -- well after
  // that initial double-mount has settled, triggered by a real playback
  // event -- sidesteps that entirely.
  useEffect(() => {
    if (stage !== "exiting") return;
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {
      // ignore -- worst case it replays on the next load, not worth blocking on
    }
  }, [stage]);

  if (seen || stage === "done") return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{ transformOrigin: "center" }}
      // CRT power-off: squish vertically to a thin bright line, hold it
      // briefly, then that line fades to nothing -- ~350ms total.
      animate={
        stage === "exiting"
          ? { scaleY: [1, 0.015, 0.015], opacity: [1, 1, 0] }
          : { scaleY: 1, opacity: 1 }
      }
      transition={stage === "exiting" ? { duration: EXIT_DURATION_S, times: [0, 0.55, 1], ease: EASE } : undefined}
      onAnimationComplete={() => {
        // Also fires for the trivial "playing" resting-state animation on
        // mount -- only act on the real exit.
        if (stage === "exiting") setStage("done");
      }}
    >
      <video
        ref={videoRef}
        src="/boot-intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
        className="h-auto max-h-[80vh] w-full max-w-3xl object-contain"
      />

      <button
        type="button"
        onClick={finish}
        className="absolute right-6 bottom-6 text-xs text-white/30 transition-colors hover:text-white/60"
      >
        Skip
      </button>
    </motion.div>
  );
}
