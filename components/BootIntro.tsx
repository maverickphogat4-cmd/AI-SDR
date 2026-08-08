"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SignatureMoment } from "@/components/SignatureMoment";

const BOOT_SEEN_KEY = "cadence-boot-seen";
// boot-intro.mp4 is ~10s at 1x, played at 2x below -- so it naturally ends
// around 5s. This is a safety net for if onEnded never fires at all (not a
// "trim the video short" timer), so it has to sit comfortably above that.
const FALLBACK_MS = 7000;

// `useSyncExternalStore` plumbing for "has this session already seen the
// boot". There's nothing to actually subscribe to -- we only ever read this
// once, right after hydration -- but the hook still gives us the safe
// "render the server value first, then correct to the real client value"
// behavior for free, without a setState-in-effect footgun (see the same
// pattern for the Page Visibility API in components/ColorBendsBackground.tsx).
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

// playing: video fills the screen.
// signature: video has ended -- the shared LightTunnel + SplitFlapText
//   moment (see components/SignatureMoment.tsx) plays on top of it.
// exiting: signature moment's hold finished -- AnimatePresence is fading it
//   out (see onComplete/onExitComplete below).
// done: nothing left to render -- the site underneath shows through.
type Stage = "playing" | "signature" | "exiting" | "done";

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

  // The video ending (normally, on error, or via the timeout below) hands
  // off to the signature moment -- it does not reveal the site directly.
  const finishVideo = useCallback(() => {
    clearFallback();
    setStage((s) => (s === "playing" ? "signature" : s));
  }, [clearFallback]);

  // Explicit "Skip" click bypasses the signature moment too -- someone
  // reaching for Skip wants out immediately, not one more 1.5s beat.
  const skipAll = useCallback(() => {
    clearFallback();
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {
      // ignore -- worst case it replays on the next load, not worth blocking on
    }
    setStage("done");
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

    fallbackTimer.current = setTimeout(finishVideo, FALLBACK_MS);
    return clearFallback;
  }, [seen, stage, finishVideo, clearFallback]);

  // Mark the session as "seen" only once the sequence actually concludes --
  // deliberately NOT proactively at mount. Writing at mount is what breaks
  // under React Strict Mode's dev-only double-invoke (mount -> run effects
  // -> unmount -> mount again, to catch non-idempotent effects): the first
  // pass's write would already be sitting in sessionStorage by the time the
  // second, real pass re-checks `seen`, making it think the boot had
  // already played and skip it outright. Writing here instead -- well after
  // that initial double-mount has settled, triggered by the signature
  // moment's hold finishing -- sidesteps that entirely. (The explicit Skip
  // path writes it directly in skipAll above, for the same reason.)
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
    <>
      {stage === "playing" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black">
          <video
            ref={videoRef}
            src="/boot-intro.mp4"
            autoPlay
            muted
            playsInline
            onEnded={finishVideo}
            onError={finishVideo}
            // Fills the viewport edge-to-edge -- object-cover crops rather
            // than letterboxes, so there's no visible black border around
            // the frame regardless of the video's own aspect ratio.
            className="absolute inset-0 h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={skipAll}
            className="absolute right-6 bottom-6 z-10 text-xs text-white/30 transition-colors hover:text-white/60"
          >
            Skip
          </button>
        </div>
      )}

      <AnimatePresence onExitComplete={() => setStage("done")}>
        {stage === "signature" && (
          <SignatureMoment key="boot-signature" onComplete={() => setStage("exiting")} />
        )}
      </AnimatePresence>
    </>
  );
}
