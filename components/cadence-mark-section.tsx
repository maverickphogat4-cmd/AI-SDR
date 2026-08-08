"use client";

import { motion, useMotionTemplate, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { GetStartedButton } from "@/components/get-started-button";

const ACCENT = "#10B981";

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
  const filter = useMotionTemplate`drop-shadow(0 0 ${glowBlur}px rgba(16, 185, 129, ${glowAlpha}))`;

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

/**
 * Signature scroll moment: a 300vh section pins the "C" mark center-screen
 * (sticky trick -- see the wrapping div below) while three arcs light up in
 * sequence, one per scroll third. (The value points that used to cycle
 * inside this same viewport slot moved out into their own section -- see
 * components/stat-cards.tsx -- so this is purely the C's own illumination
 * now.) The closing "Get started" uses the same GetStartedButton (and the
 * same LightTunnel + SplitFlapText transition) as every other one on the
 * site -- this section no longer has its own bespoke click handler.
 */
export function CadenceMarkSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  const buttonOpacity = useTransform(scrollYProgress, [0.85, 1], [0, 1]);
  const buttonY = useTransform(scrollYProgress, [0.85, 1], [16, 0]);
  const buttonPointerEvents = useTransform(scrollYProgress, (v) => (v > 0.9 ? "auto" : "none"));

  return (
    // z-10, no bg of its own -- the page-wide ColorBendsBackground (z-0,
    // see app/page.tsx) shows through here on purpose; z-10 is what keeps
    // this section's own content painting above it instead of the two
    // fighting for the same stacking level.
    <section ref={sectionRef} className="relative z-10" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        {/* Ambient glow behind the mark -- extra warmth on top of the page's
            own ColorBends background, not a replacement for it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div className="relative h-[380px] w-[380px] sm:h-[460px] sm:w-[460px] lg:h-[520px] lg:w-[520px]">
          <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
            {SEGMENTS.map((seg, i) => (
              <CSegment key={seg.id} path={SEGMENT_PATHS[i]} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
            ))}
          </svg>
        </div>

        <motion.div style={{ opacity: buttonOpacity, y: buttonY, pointerEvents: buttonPointerEvents }} className="mt-12">
          <GetStartedButton size="lg">Get started</GetStartedButton>
        </motion.div>
      </div>
    </section>
  );
}
