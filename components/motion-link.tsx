"use client";

import { motion } from "framer-motion";
import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

// Same hover/tap feel as MotionButton, but for the landing page's CTA,
// which needs to be a real <a> (via next/link) for prefetching + routing.
// Wrapping Link in a motion.span rather than animating Link directly sidesteps
// any dependency on how next/link forwards refs -- the wrapper handles the
// transform, the anchor inside just carries its normal className styling.
const HOVER = { scale: 1.02, y: -2 };
const TAP = { scale: 0.98 };
const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

type MotionLinkProps = LinkProps & { className?: string; children: ReactNode };

export function MotionLink({ className, children, ...props }: MotionLinkProps) {
  return (
    <motion.span whileHover={HOVER} whileTap={TAP} transition={SPRING} className="inline-block">
      <Link className={className} {...props}>
        {children}
      </Link>
    </motion.span>
  );
}
