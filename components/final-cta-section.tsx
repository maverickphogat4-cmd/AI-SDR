"use client";

import { motion, type Variants } from "framer-motion";
import { GetStartedButton } from "@/components/get-started-button";
import { EASE } from "@/lib/motion";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// Second path to /dashboard, alongside the always-visible nav button --
// this one only appears once the user has scrolled down to it.
export function FinalCtaSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={containerVariants}
        className="flex flex-col items-center"
      >
        <motion.h2
          variants={itemVariants}
          className="max-w-2xl font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
        >
          Ready to get started?
        </motion.h2>
        <motion.p variants={itemVariants} className="mt-4 max-w-md text-lg text-zinc-400">
          Paste a few prospects. Watch the tone shift in real time.
        </motion.p>
        <motion.div variants={itemVariants} className="mt-10">
          <GetStartedButton className="inline-flex h-14 items-center justify-center rounded-full bg-teal-400 px-10 text-lg font-semibold text-black shadow-[0_0_24px_-4px_rgba(45,212,191,0.5)] transition-shadow hover:bg-teal-300 hover:shadow-[0_0_36px_-2px_rgba(45,212,191,0.65)]">
            Get started
          </GetStartedButton>
        </motion.div>
      </motion.div>
    </section>
  );
}
