"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

// Every clickable button in the app goes through this so the hover/tap
// feel is identical everywhere instead of hand-tuned per instance. Visual
// styling (color, border, shadow) stays in each caller's className --
// this component only owns the motion.
//
// Typed as HTMLMotionProps, not React.ComponentProps<"button"> -- plain DOM
// button props collide with framer's own event types (onAnimationStart,
// onDrag, etc. have incompatible signatures between the two), so this is
// the type framer-motion itself expects `motion.button` to receive.
const HOVER = { scale: 1.02, y: -2 };
const TAP = { scale: 0.98 };
const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

export function MotionButton({ className, children, ...props }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileHover={HOVER}
      whileTap={TAP}
      transition={SPRING}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}
