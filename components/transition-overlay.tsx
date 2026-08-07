"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { EASE } from "@/lib/motion";

// Cover duration is the number that has to fit the "under ~700ms total"
// budget alongside the reveal fade below (480 + 180 = 660ms) -- tune both
// together, not in isolation.
const COVER_DURATION_S = 0.48;
const REVEAL_DURATION_S = 0.18;
// If onAnimationComplete never fires (reduced-motion settings can skip the
// animation outright, or a slow tab can stall rAF), this fires the
// navigation anyway so a click never silently does nothing.
const FALLBACK_DELAY_MS = COVER_DURATION_S * 1000 + 150;

type TransitionContextValue = {
  navigate: (href: string) => void;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

/** Every "Get started" button calls this instead of navigating directly --
 * see components/get-started-button.tsx. */
export function useGetStartedTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("useGetStartedTransition must be used within <TransitionOverlayProvider>");
  }
  return ctx;
}

/**
 * Renders the full-screen wipe panel and owns the cover -> navigate -> reveal
 * sequence. Lives in app/layout.tsx, OUTSIDE PageTransition's
 * pathname-keyed AnimatePresence -- if it were inside, the route change it
 * triggers would unmount it mid-animation before the reveal ever played.
 */
export function TransitionOverlayProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const targetHref = useRef<string | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The destination page can easily be shorter than however far the user
  // had scrolled on the landing page (the final CTA section, the most
  // likely click point, sits at the very bottom of it). Next's router
  // scroll-reset isn't reliable here since navigation is triggered
  // imperatively rather than through a plain <Link> click, so force it
  // ourselves -- timed to happen while the screen is fully covered, so the
  // jump is invisible.
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
      if (active) return; // already mid-transition -- ignore repeat clicks
      targetHref.current = href;
      setActive(true);
      fallbackTimer.current = setTimeout(performNavigation, FALLBACK_DELAY_MS);
    },
    [active, performNavigation]
  );

  // Fires when the cover sweep finishes. Navigate immediately, then let the
  // overlay fade itself back out a beat later -- by then the new route has
  // mounted (and is doing its own arrival animation underneath).
  const handleCoverComplete = () => {
    performNavigation();
    setActive(false);
  };

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            key="transition-overlay"
            aria-hidden
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ opacity: 0, transition: { duration: REVEAL_DURATION_S, ease: EASE } }}
            transition={{ duration: COVER_DURATION_S, ease: EASE }}
            onAnimationComplete={handleCoverComplete}
            style={{ transformOrigin: "bottom" }}
            className="fixed inset-0 z-50 bg-teal-400"
          />
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
