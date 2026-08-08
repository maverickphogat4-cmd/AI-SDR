"use client";

import { motion } from "framer-motion";
import LightTunnel from "@/components/react-bits/LightTunnel";
import SplitFlapText from "@/components/react-bits/SplitFlapText";
import { EASE } from "@/lib/motion";

const ACCENT = "#10B981";

// Total time the overlay is fully shown -- tunnel + text play, then the
// caller cuts away. Kept snappy on purpose: this is the app's one signature
// moment, so it has to carry the whole "something happened" beat on its own
// without dragging.
export const SIGNATURE_MOMENT_S = 1.3;
export const SIGNATURE_FADE_S = 0.25;

/**
 * The site's one signature visual: an emerald LightTunnel background with a
 * SplitFlapText message flipping in on top. Shared by the "Get started"
 * click transition (components/GetStartedTransition.tsx) and the boot
 * intro's closing beat (components/BootIntro.tsx) -- same effect, two
 * callers, so there's exactly one place that owns what it looks like.
 *
 * Purely presentational: mounts already at opacity 0, fades in fast, holds
 * for SIGNATURE_MOMENT_S, then calls onComplete -- at which point the caller
 * decides what happens next (navigate, reveal the site, etc.) and whether to
 * unmount it. Wrap the caller's conditional render in <AnimatePresence> to
 * get the fade-out below for free when it's removed.
 */
export function SignatureMoment({
  words = ["", "ENTERING CADENCE"],
  onComplete,
}: {
  words?: string[];
  onComplete?: () => void;
}) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1] }}
      transition={{ duration: SIGNATURE_MOMENT_S, times: [0, 0.15, 1], ease: EASE }}
      exit={{ opacity: 0, transition: { duration: SIGNATURE_FADE_S, ease: EASE } }}
      onAnimationComplete={onComplete}
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
          words={words}
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
  );
}
