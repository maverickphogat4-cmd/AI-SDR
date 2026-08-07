"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import LightTunnel from "@/components/react-bits/LightTunnel";
import SplitFlapText from "@/components/react-bits/SplitFlapText";
import { EASE } from "@/lib/motion";

const ACCENT = "#10B981";

// Total time the overlay is fully shown -- tunnel + text play, then we cut
// away. Kept snappy on purpose: this replaces every other transition effect
// in the app (teal wipe, gold particle burst), so it has to carry the whole
// "something happened" moment on its own without dragging.
const SEQUENCE_S = 1.3;
const FADE_S = 0.25;
// Absolute safety net in case onAnimationComplete never fires (reduced-motion
// settings can skip framer animations outright) -- navigation still happens.
const FALLBACK_MS = SEQUENCE_S * 1000 + 400;

type TransitionContextValue = {
  navigate: (href: string) => void;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

/** Every "Get started" button calls this instead of navigating directly --
 * see components/get-started-button.tsx. */
export function useGetStartedTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("useGetStartedTransition must be used within <GetStartedTransitionProvider>");
  }
  return ctx;
}

/**
 * Renders the LightTunnel + SplitFlapText overlay and owns the
 * show -> navigate -> reveal sequence. Lives in app/layout.tsx, OUTSIDE
 * PageTransition's pathname-keyed AnimatePresence -- if it were inside, the
 * route change it triggers would unmount it mid-sequence before the reveal
 * ever played.
 */
export function GetStartedTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const targetHref = useRef<string | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The destination page can easily be shorter than however far the user
  // had scrolled on the landing page (the C section, the most likely click
  // point, is 300vh tall). Force scroll-to-top ourselves, timed to happen
  // while the screen is fully covered, so the jump is invisible.
  const performNavigation = useCallback(() => {
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    if (targetHref.current) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      router.push(targetHref.current);
      targetHref.current = null;
    }
  }, [router]);

  const navigate = useCallback(
    (href: string) => {
      if (active) return; // already mid-sequence -- ignore repeat clicks
      targetHref.current = href;
      setActive(true);
      fallbackTimer.current = setTimeout(performNavigation, FALLBACK_MS);
    },
    [active, performNavigation]
  );

  // Fires when the show-sequence completes. Navigate immediately, then let
  // the overlay fade itself back out a beat later -- by then the new route
  // has mounted (and is doing its own arrival animation underneath).
  const handleSequenceComplete = () => {
    performNavigation();
    setActive(false);
  };

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            key="get-started-transition"
            aria-hidden
            className="fixed inset-0 z-50 overflow-hidden bg-black"
            // Opacity ramps up fast (first ~15% of the sequence), holds at
            // full while the tunnel + text play, then this whole keyframe
            // animation's completion -- at the very end of SEQUENCE_S -- is
            // the cue to navigate.
            animate={{ opacity: [0, 1, 1] }}
            transition={{ duration: SEQUENCE_S, times: [0, 0.15, 1], ease: EASE }}
            exit={{ opacity: 0, transition: { duration: FADE_S, ease: EASE } }}
            onAnimationComplete={handleSequenceComplete}
          >
            <div className="absolute inset-0">
              <LightTunnel
                pulseColor={ACCENT}
                cableColor={ACCENT}
                speed={1.6}
                pulseSpeed={3.5}
                cableCount={16}
                mouseInteraction={false}
              />
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-6">
              <SplitFlapText
                words={["", "ENTERING CADENCE"]}
                loop={false}
                cycleDelay={100}
                flipDuration={0.08}
                stagger={0.035}
                flipsPerChar={4}
                charset="alpha"
                tileColor="#000000"
                textColor={ACCENT}
                fontSize="clamp(16px, 4vw, 40px)"
                gap={4}
                tileRadius={6}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
