"use client";

import { motion, useMotionTemplate, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { GetStartedButton } from "@/components/get-started-button";
import { easeFn } from "@/lib/motion";

const ACCENT = "#2dd4bf";

// ---------------------------------------------------------------------------
// The "C" is an open circle -- gap centered on the right (3 o'clock) -- split
// into three equal 100deg arcs so each can be styled/animated independently.
// Angle 0 = right, 90 = top, 180 = left, 270 = bottom (standard on-screen
// counterclockwise-from-right convention; see polarToCartesian).
// ---------------------------------------------------------------------------
const CENTER = 200;
const RADIUS = 150;
const STROKE_WIDTH = 30;

const SEGMENTS = [
  { id: "top", from: 30, to: 130 },
  { id: "middle", from: 130, to: 230 }, // the C's left-side "belly" -- visually the middle of the letterform
  { id: "bottom", from: 230, to: 330 },
] as const;

// Each segment's active window as a fraction of the section's scroll range.
const SEGMENT_RANGES: [number, number][] = [
  [0, 0.33],
  [0.33, 0.66],
  [0.66, 1],
];

function polarToCartesian(angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.cos(angleRad),
    y: CENTER - RADIUS * Math.sin(angleRad),
  };
}

function describeArc(from: number, to: number) {
  const start = polarToCartesian(from);
  const end = polarToCartesian(to);
  const largeArcFlag = to - from > 180 ? 1 : 0;
  // sweep=0: our angle increases counterclockwise on screen (see
  // polarToCartesian's y = center - r*sin), so this draws the short way
  // around in that same direction.
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

const SEGMENT_PATHS = SEGMENTS.map((seg) => describeArc(seg.from, seg.to));

const POINTS = [
  {
    heading: "Researches every prospect",
    body: "References their real recent activity -- a LinkedIn post, a funding round, a new hire -- not a guess.",
  },
  {
    heading: "Writes, never templates",
    body: "Each email is grounded in one specific fact about the prospect, not filled into a mail-merge blank.",
  },
  {
    heading: "Remembers every touch",
    body: "Adjusts tone based on past replies -- warmer after a reply, more direct after silence.",
  },
] as const;

/** One arc: dim by default, brightens (opacity + glow) as scroll progress
 * fills its own slice of the range. */
function CSegment({
  path,
  progress,
  range,
}: {
  path: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const local = useTransform(progress, range, [0, 1], { clamp: true });
  const strokeOpacity = useTransform(local, [0, 1], [0.15, 1]);
  const glowBlur = useTransform(local, [0, 1], [0, 16]);
  const glowAlpha = useTransform(local, [0, 1], [0, 0.9]);
  const filter = useMotionTemplate`drop-shadow(0 0 ${glowBlur}px rgba(45, 212, 191, ${glowAlpha}))`;

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={ACCENT}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      style={{ opacity: strokeOpacity, filter }}
    />
  );
}

/** One value point: flies in (x + opacity + blur-to-sharp), holds, then
 * hands off to the next. All three share the same slot -- only the one
 * whose window contains the current scroll progress is visible. Driven
 * directly off scroll position (not whileInView), so it's fully reversible:
 * scrolling back up un-plays it, same as the C's own illumination. */
function ValuePoint({
  point,
  progress,
  range,
}: {
  point: (typeof POINTS)[number];
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const [start, end] = range;
  const span = end - start;
  const keyframes = [start, start + span * 0.15, end - span * 0.15, end];

  const opacity = useTransform(progress, keyframes, [0, 1, 1, 0], { ease: [easeFn, easeFn, easeFn] });
  const x = useTransform(progress, keyframes, [-40, 0, 0, 24], { ease: [easeFn, easeFn, easeFn] });
  const blurPx = useTransform(progress, keyframes, [8, 0, 0, 6], { ease: [easeFn, easeFn, easeFn] });
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.div
      style={{ opacity, x, filter }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
    >
      <h3 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">{point.heading}</h3>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-zinc-300">{point.body}</p>
    </motion.div>
  );
}

/**
 * Signature scroll moment: a 300vh section pins the "C" mark center-screen
 * (sticky trick -- see the wrapping div below) while three arcs light up in
 * sequence, one per scroll third, each paired with a value point. The
 * closing "Get started" uses the same GetStartedButton (and the same
 * LightTunnel + SplitFlapText transition) as every other one on the site --
 * this section no longer has its own bespoke click handler.
 */
export function CadenceMarkSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  const buttonOpacity = useTransform(scrollYProgress, [0.85, 1], [0, 1]);
  const buttonY = useTransform(scrollYProgress, [0.85, 1], [16, 0]);
  const buttonPointerEvents = useTransform(scrollYProgress, (v) => (v > 0.9 ? "auto" : "none"));

  return (
    <section ref={sectionRef} className="relative bg-black" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        {/* Ambient glow instead of a second live particle field -- the hero's
            Three.js canvas is scoped to the hero section only, so there's no
            competing motion here to fight with; this just keeps the backdrop
            from being flat black behind the mark. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/10 blur-3xl"
        />

        <div className="relative h-[380px] w-[380px] sm:h-[460px] sm:w-[460px] lg:h-[520px] lg:w-[520px]">
          <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
            {SEGMENTS.map((seg, i) => (
              <CSegment key={seg.id} path={SEGMENT_PATHS[i]} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
            ))}
          </svg>

          {POINTS.map((point, i) => (
            <ValuePoint key={point.heading} point={point} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
          ))}
        </div>

        <motion.div style={{ opacity: buttonOpacity, y: buttonY, pointerEvents: buttonPointerEvents }} className="mt-12">
          <GetStartedButton className="inline-flex h-14 items-center justify-center rounded-full bg-teal-400 px-10 text-lg font-semibold text-black shadow-[0_0_24px_-4px_rgba(45,212,191,0.5)] transition-shadow hover:bg-teal-300 hover:shadow-[0_0_36px_-2px_rgba(45,212,191,0.65)]">
            Get started
          </GetStartedButton>
        </motion.div>
      </div>
    </section>
  );
}
