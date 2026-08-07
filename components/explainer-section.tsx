"use client";

import { motion, type Variants } from "framer-motion";
import { EASE } from "@/lib/motion";

const POINTS = [
  {
    title: "Researches every prospect",
    body: "References their real recent activity -- a LinkedIn post, a funding round, a new hire -- not a guess.",
  },
  {
    title: "Writes, never templates",
    body: "Each email is grounded in one specific fact about the prospect, not filled into a mail-merge blank.",
  },
  {
    title: "Remembers every touch",
    body: "Adjusts tone based on past replies -- warmer after a reply, more direct after silence.",
  },
];

// Parent's whileInView flips the container into "visible", which cascades
// into each card via staggerChildren -- same stagger-through-variants
// pattern as the hero (components/hero-content.tsx), just triggered by
// scroll position instead of mount.
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function ExplainerSection() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 py-32 sm:px-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
        className="grid gap-6 sm:grid-cols-3"
      >
        {POINTS.map((point) => (
          <motion.div
            key={point.title}
            variants={itemVariants}
            className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-colors hover:border-white/20"
          >
            <h3 className="font-heading text-xl font-semibold tracking-tight text-white">{point.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{point.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
