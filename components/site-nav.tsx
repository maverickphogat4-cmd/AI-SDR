"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { GetStartedButton } from "@/components/get-started-button";

// Interpolated straight from scroll position via a MotionValue, not a
// scroll-event listener driving setState -- this never triggers a React
// re-render, just repaints the one CSS property, which is what keeps a
// scroll-linked animation smooth. Subtle from the top (still readable over
// the hero) up to solid once the user has scrolled roughly past it.
const SCROLL_RANGE = [0, 280];
const OPACITY_RANGE = [0.35, 0.92];

export function SiteNav() {
  const { scrollY } = useScroll();
  const backgroundOpacity = useTransform(scrollY, SCROLL_RANGE, OPACITY_RANGE);

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/10">
      <motion.div aria-hidden style={{ opacity: backgroundOpacity }} className="absolute inset-0 bg-black backdrop-blur-md" />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="font-heading text-lg font-medium tracking-tight text-white">
          Cadence
        </Link>

        <GetStartedButton className="inline-flex h-10 items-center justify-center rounded-full bg-teal-400 px-5 text-sm font-medium text-black shadow-[0_0_16px_-4px_rgba(45,212,191,0.5)] transition-shadow hover:bg-teal-300 hover:shadow-[0_0_24px_-2px_rgba(45,212,191,0.65)]">
          Get started
        </GetStartedButton>
      </div>
    </nav>
  );
}
