"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { SignatureMoment, SIGNATURE_MOMENT_S } from "@/components/SignatureMoment";

// Absolute safety net in case onAnimationComplete never fires (reduced-motion
// settings can skip framer animations outright) -- navigation still happens.
const FALLBACK_MS = SIGNATURE_MOMENT_S * 1000 + 400;

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
 * Owns the show -> navigate -> reveal sequence around the shared
 * SignatureMoment (see components/SignatureMoment.tsx). Lives in
 * app/layout.tsx, OUTSIDE PageTransition's pathname-keyed AnimatePresence --
 * if it were inside, the route change it triggers would unmount it
 * mid-sequence before the reveal ever played.
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
        {active && <SignatureMoment key="get-started-transition" onComplete={handleSequenceComplete} />}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
