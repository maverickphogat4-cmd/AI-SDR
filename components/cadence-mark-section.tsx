"use client";

import { motion, useMotionTemplate, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { GetStartedButton } from "@/components/get-started-button";
import TextPressure from "@/components/react-bits/TextPressure";
import { easeFn } from "@/lib/motion";

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

const POINTS = [
  {
    heading: "Researches every prospect",
    body: "References their real recent activity: a LinkedIn post, a funding round, a new hire, not a guess.",
  },
  {
    heading: "Writes, never templates",
    body: "Each email grounded in one specific fact, not a mail-merge blank.",
  },
  {
    heading: "Remembers every touch",
    body: "Adjusts tone based on past replies: warmer after a reply, more direct after silence.",
  },
] as const;

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
 * fills its own slice of the range, and -- because useTransform clamps at
 * the range's upper bound -- stays lit once that slice has passed, instead
 * of dimming back down as later segments take their turn. */
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

/** One value point: flies in (x + opacity + blur-to-sharp) beside the C,
 * holds, then hands off to the next. All three share the same slot --
 * only the one whose window contains the current scroll progress is
 * visible. Driven directly off scroll position (not whileInView), so it's
 * fully reversible: scrolling back up un-plays it, same as the C's own
 * illumination. */
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
  const x = useTransform(progress, keyframes, [-24, 0, 0, 16], { ease: [easeFn, easeFn, easeFn] });
  const blurPx = useTransform(progress, keyframes, [8, 0, 0, 6], { ease: [easeFn, easeFn, easeFn] });
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.div
      style={{ opacity, x, filter }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center lg:items-start lg:text-left"
    >
      <h3 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{point.heading}</h3>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-zinc-300">{point.body}</p>
    </motion.div>
  );
}

/**
 * Signature scroll moment: a 300vh section pins the "C" mark + a value-point
 * text slot center-screen (sticky trick -- see the wrapping div below) while
 * three arcs light up in sequence, one per scroll third, each paired with
 * the value point that flies in beside it. The closing "Get started" uses
 * the same GetStartedButton (and the same LightTunnel + SplitFlapText
 * transition) as every other one on the site -- this section no longer has
 * its own bespoke click handler. Its label runs through TextPressure (see
 * the button JSX below) as this section's one extra flourish.
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
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6">
        {/* Ambient glow behind the mark -- extra warmth on top of the page's
            own ColorBends background, not a replacement for it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:justify-center lg:gap-16">
          <div className="relative h-[320px] w-[320px] shrink-0 sm:h-[400px] sm:w-[400px] lg:h-[440px] lg:w-[440px]">
            <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
              {SEGMENTS.map((seg, i) => (
                <CSegment key={seg.id} path={SEGMENT_PATHS[i]} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
              ))}
            </svg>
          </div>

          {/* Value-point text slot, beside the C -- the same "one shared
              slot, cross-fade" trick as the arcs' scroll sync, just scoped
              to this column instead of the whole viewport. The blurred dark
              backdrop is the "text-zone vignette" for contrast over the
              moving background, separate from the page-wide one. Fixed
              pixel widths, not w-full: this row's own width is itself
              shrink-to-fit (its parent doesn't stretch it), and a
              percentage-width flex child inside a shrink-to-fit container
              is a classic circular-sizing bug that resolves to 0 width. */}
          <div className="relative h-[160px] w-[280px] sm:w-[320px] lg:h-[200px] lg:w-[360px]">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-black/30 blur-2xl" />
            {POINTS.map((point, i) => (
              <ValuePoint key={point.heading} point={point} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
            ))}
          </div>
        </div>

        <motion.div style={{ opacity: buttonOpacity, y: buttonY, pointerEvents: buttonPointerEvents }} className="mt-12">
          <GetStartedButton size="lg">
            {/* TextPressure wants an explicitly-sized container (it reads
                its own bounding box to compute font size), not the button's
                natural content-sized width -- so this is a fixed w/h box
                sitting inside the pill instead of plain text. Scaled well
                down from the component's own demo sizing (which assumes a
                few hundred px of height) to fit a button, and only the
                weight axis is left on: Geist Sans is a weight-only variable
                font, so width/italic pressure would just be inert.

                Never use a plain ASCII space between "Get" and "started"
                below: the component wraps each character in its own
                single-character span, and a span whose entire content is
                one regular space gets that content collapsed away by
                ordinary CSS whitespace rules -- rendering as "GETSTARTED"
                with no gap at all, regardless of the flex/justify-content
                setting. A non-breaking space isn't subject to that
                collapsing, so it's what actually produces a visible gap. */}
            <span className="relative inline-block h-7 w-[150px]">
              <TextPressure
                text={"Get started"}
                fontFamily="GeistSans"
                fontUrl=""
                width={false}
                weight
                italic={false}
                alpha={false}
                flex={false}
                scale={false}
                minFontSize={16}
                textColor="#000000"
              />
            </span>
          </GetStartedButton>
        </motion.div>
      </div>
    </section>
  );
}
