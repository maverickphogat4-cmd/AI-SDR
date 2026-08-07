"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useGetStartedTransition } from "@/components/transition-overlay";

// Same hover/tap feel as MotionButton (components/motion-button.tsx), but
// for a real <a> via next/link so prefetching, right-click "open in new
// tab", and middle-click all keep working without JS.
const HOVER = { scale: 1.02, y: -2 };
const TAP = { scale: 0.98 };
const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

type GetStartedButtonProps = {
  className?: string;
  children: ReactNode;
};

/**
 * The single "Get started" trigger, used in the nav, the hero, and the
 * closing CTA section. A plain left-click is intercepted to play the wipe
 * transition (see transition-overlay.tsx) before navigating; every other
 * kind of click (middle-click, cmd/ctrl-click, etc.) falls through to the
 * underlying <Link> so "open in new tab" still behaves normally.
 */
export function GetStartedButton({ className, children }: GetStartedButtonProps) {
  const { navigate } = useGetStartedTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    navigate("/dashboard");
  };

  return (
    <motion.span whileHover={HOVER} whileTap={TAP} transition={SPRING} className="inline-block">
      <Link href="/dashboard" onClick={handleClick} className={className}>
        {children}
      </Link>
    </motion.span>
  );
}
