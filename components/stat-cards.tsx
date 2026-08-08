"use client";

import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from "framer-motion";
import { Ban, CheckCircle2, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { EASE } from "@/lib/motion";

type Stat = {
  icon: LucideIcon;
  value: number;
  suffix?: string;
  label: string;
  supporting: string;
};

// Illustrative demo figures -- kept believable on purpose, not a claim
// about a live, measured product.
const STATS: Stat[] = [
  {
    icon: TrendingUp,
    value: 3,
    suffix: "x",
    label: "Higher reply rate",
    supporting: "Versus generic, un-personalized sequences.",
  },
  {
    icon: Users,
    value: 10,
    label: "Prospects per batch",
    supporting: "Researched and written for individually, not in bulk.",
  },
  {
    icon: CheckCircle2,
    value: 100,
    suffix: "%",
    label: "Grounded in real facts",
    supporting: "Every email cites something the prospect actually said or did.",
  },
  {
    icon: Ban,
    value: 0,
    label: "Templates used",
    supporting: "No fill-in-the-blank mail merge, ever.",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Counts up from 0 to `value` once, when `active` flips true. The live
 * number is a MotionValue<string> bound directly to motion.span's children
 * -- framer-motion updates that DOM text node on each tick itself, instead
 * of a React state update (and re-render) per frame. */
function StatNumber({ value, suffix = "", active }: { value: number; suffix?: string; active: boolean }) {
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => `${Math.round(latest)}${suffix}`);

  useEffect(() => {
    if (!active) return;
    const controls = animate(count, value, { duration: 1.4, ease: EASE });
    return controls.stop;
  }, [active, value, count]);

  return <motion.span>{display}</motion.span>;
}

/**
 * Row of four animated stat cards -- the page's "what Cadence does, in
 * numbers" beat, between the hero pitch and the "C" mark's closing scroll
 * moment. Replaces the value points that used to cycle inside
 * CadenceMarkSection's pinned viewport (see that file); deliberately a
 * standard whileInView reveal instead of scroll-linked, so it plays once
 * and settles rather than competing with the C's own pinned-scroll budget.
 */
export function StatCards() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section className="relative z-10 px-6 py-24 sm:py-32">
      <motion.div
        ref={ref}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={containerVariants}
        className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
      >
        {STATS.map((stat) => (
          <motion.div
            key={stat.label}
            variants={cardVariants}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8"
          >
            <stat.icon className="h-5 w-5 text-emerald-500" strokeWidth={2} aria-hidden />

            <div className="font-heading text-4xl font-extrabold tracking-tight text-emerald-500 sm:text-5xl">
              <StatNumber value={stat.value} suffix={stat.suffix} active={inView} />
            </div>

            <div>
              <p className="text-sm font-semibold text-white sm:text-base">{stat.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{stat.supporting}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
