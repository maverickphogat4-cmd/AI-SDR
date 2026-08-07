"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EASE } from "@/lib/motion";

/**
 * Root-level crossfade between routes. Next's App Router doesn't pause a
 * navigation for an exit animation, so this isn't a true "wait for fade-out,
 * then navigate" -- it's the standard, much simpler pattern: key a motion.div
 * by pathname inside AnimatePresence, and the outgoing page fades out while
 * the incoming one fades in on top of it. Deliberately just an opacity
 * crossfade -- anything fancier here fights the browser's own navigation
 * timing more than it's worth.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
