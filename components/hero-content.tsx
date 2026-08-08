"use client";

import { motion, type Variants } from "framer-motion";
import { GetStartedButton } from "@/components/get-started-button";
import { EASE } from "@/lib/motion";

// Parent orchestrates the stagger; each child just declares its own
// hidden/visible state and inherits timing from here. ~80ms between
// children reads as "cascading" without feeling slow.
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function HeroContent() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative flex flex-col items-center text-center"
    >
      {/* Soft radial glow behind the headline -- decorative only, sits below
          the text via -z-10 inside this already-positioned wrapper. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-12 left-1/2 -z-10 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl"
      />

      <motion.span
        variants={itemVariants}
        className="mb-6 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-medium tracking-wide text-emerald-300 uppercase"
      >
        Research-driven outreach
      </motion.span>

      <motion.h1
        variants={itemVariants}
        className="max-w-3xl font-heading text-5xl font-extrabold tracking-tight text-white sm:text-6xl"
      >
        AI SDR that remembers
      </motion.h1>

      <motion.p variants={itemVariants} className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
        Every email is grounded in what a prospect actually said and did, not a template. Every follow-up
        adjusts its tone based on whether they replied last time.
      </motion.p>

      <motion.div variants={itemVariants} className="mt-10">
        <GetStartedButton size="md">Get started</GetStartedButton>
      </motion.div>
    </motion.div>
  );
}
