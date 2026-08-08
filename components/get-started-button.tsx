"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useGetStartedTransition } from "@/components/GetStartedTransition";

// Same hover/tap feel as MotionButton (components/motion-button.tsx), but
// for a real <a> via next/link so prefetching, right-click "open in new
// tab", and middle-click all keep working without JS.
const HOVER = { scale: 1.02, y: -2 };
const TAP = { scale: 0.98 };
const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

// Height/padding/text-size are the only things that actually differ across
// the three "Get started" placements (nav, hero, closing CTA) -- color,
// shape, and the hover glow are owned centrally below so all three read as
// one button at three sizes, not three separately-tuned buttons.
const SIZE_STYLES = {
  sm: "h-10 px-5 text-sm",
  md: "h-12 px-8 text-base",
  lg: "h-14 px-10 text-lg",
} as const;

type GetStartedButtonProps = {
  size?: keyof typeof SIZE_STYLES;
  className?: string;
  children: ReactNode;
};

/**
 * The single "Get started" trigger, used in the nav, the hero, and the
 * closing CTA section. A plain left-click is intercepted to play the
 * LightTunnel + SplitFlapText transition (see GetStartedTransition.tsx)
 * before navigating; every other kind of click (middle-click, cmd/ctrl-click,
 * etc.) falls through to the underlying <Link> so "open in new tab" still
 * behaves normally.
 */
export function GetStartedButton({ size = "md", className, children }: GetStartedButtonProps) {
  const { navigate } = useGetStartedTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    navigate("/dashboard");
  };

  return (
    <motion.span whileHover={HOVER} whileTap={TAP} transition={SPRING} className="inline-block">
      <Link
        href="/dashboard"
        onClick={handleClick}
        className={`inline-flex items-center justify-center rounded-full bg-emerald-500 font-semibold text-black shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] transition-shadow hover:bg-emerald-400 hover:shadow-[0_0_32px_-2px_rgba(16,185,129,0.65)] ${SIZE_STYLES[size]} ${className ?? ""}`}
      >
        {children}
      </Link>
    </motion.span>
  );
}
