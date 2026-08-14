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
    body: "Before a single word is written, Cadence pulls what's actually happening with your prospect, their latest LinkedIn post, a fresh funding round, a new hire, a product launch. Every email starts from a real, recent fact, never a guess or a generic assumption.",
  },
  {
    heading: "Writes, never templates",
    body: "Each email is built around one specific detail about that person, not dropped into a mail-merge blank with their first name swapped in. The result reads like it was written by someone who actually did their homework, because it was.",
  },
  {
    heading: "Remembers every touch",
    body: "Cadence remembers every previous email and how the prospect responded. Follow-ups adapt automatically, warmer and more familiar after a reply, tighter and more direct after silence, so every touch builds on the last instead of starting over.",
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

/** One value point: flies in (x + opacity + blur-to-sharp), holds, then
 * hands off to the next. All three share the same slot (absolute inset-0
 * within a single sized wrapper, see the caller) -- only the one whose
 * window contains the current scroll progress is visible. Driven directly
 * off scroll position (not whileInView/AnimatePresence), so it's fully
 * reversible and continuously scroll-scrubbed: scrolling back up un-plays
 * it, same as the C's own illumination. */
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
  const x = useTransform(progress, keyframes, [-20, 0, 0, 20], { ease: [easeFn, easeFn, easeFn] });
  const blurPx = useTransform(progress, keyframes, [8, 0, 0, 6], { ease: [easeFn, easeFn, easeFn] });
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.div
      style={{ opacity, x, filter }}
      // flex-col + justify-center (no justify-between, no spacer) is what
      // keeps the heading and its description moving and centering as one
      // tight unit -- gap between them comes only from the paragraph's own
      // mt-5, not from anything pushing the two apart.
      className="pointer-events-none absolute inset-0 flex flex-col justify-center text-left"
    >
      <h3 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{point.heading}</h3>
      <p className="mt-5 font-sans text-base leading-relaxed text-zinc-300">{point.body}</p>
    </motion.div>
  );
}

/**
 * Signature scroll moment: a 300vh section pins a single full-viewport-
 * height flex ROW (sticky trick -- see the wrapping div below) split into
 * two equal flex-1 halves: the "C" mark centered in the left half, the
 * active value point centered in the right half. Both halves are
 * positioned purely by that flex row (items-center on the row handles
 * vertical centering, flex-1 + justify-center on each half handles
 * horizontal) -- no absolute positioning or hardcoded top/left offsets are
 * used to PLACE either one, which is what previously let the C clip under
 * the nav and the text jam against the right edge. Three arcs light up in
 * sequence as the section scrolls, one per scroll third, each paired with
 * the value point that fades in on the right; both halves' POSITIONS never
 * move, only their content's opacity/glow does. The closing "Get started"
 * (floating, bottom-center of the same sticky row) uses the same
 * GetStartedButton (and the same LightTunnel + SplitFlapText transition) as
 * every other one on the site -- this section no longer has its own
 * bespoke click handler. Its label runs through TextPressure as this
 * section's one extra flourish.
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
      <div className="sticky top-0 flex h-screen w-full items-center justify-center gap-16 px-16">
        {/* LEFT half: the C, and nothing else. items-center (on the row
            above) + justify-center (here) is ALL that positions it -- no
            overflow-hidden on any ancestor, so the glow's blur filter is
            never clipped. */}
        <div className="flex flex-1 items-center justify-center">
          {/* clamp(...) caps the C (including its own glow, which sits
              inset-0 on this same box) at 60vh tall, so on any realistic
              viewport it sits well clear of both the nav above and the
              screen edge below -- never touches either. */}
          <div className="relative h-[clamp(200px,60vh,480px)] w-[clamp(200px,60vh,480px)]">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-emerald-400/10 blur-3xl" />
            <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
              {SEGMENTS.map((seg, i) => (
                <CSegment key={seg.id} path={SEGMENT_PATHS[i]} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
              ))}
            </svg>
          </div>
        </div>

        {/* RIGHT half: the active value point, vertically centered at the
            same height as the C (both are centered by the same row). */}
        <div className="flex flex-1 flex-col justify-center">
          {/* This inner box is what the three ValuePoints stack inside via
              absolute inset-0 for their scroll-scrubbed cross-fade -- it
              needs its own explicit min-height because a box whose only
              content is absolutely-positioned children has nothing left in
              normal flow to size itself by, and would otherwise collapse to
              0 height. Sized for the longest point's now-fuller copy (was
              180px/28rem when the body copy was one thin line -- too short
              a box just meant more empty space for justify-center to split
              above/below the heading+description group, reading as an
              awkward gap). max-w-[30rem] keeps lines from stretching too
              wide while still wrapping the expanded copy comfortably. */}
          <div className="relative min-h-[220px] w-full max-w-[30rem]">
            {POINTS.map((point, i) => (
              <ValuePoint key={point.heading} point={point} progress={scrollYProgress} range={SEGMENT_RANGES[i]} />
            ))}
          </div>
        </div>

        {/* Floating CTA, not a third flex participant: absolute positioning
            takes it out of flow entirely, so it has zero effect on the two
            flex-1 halves' equal split above. */}
        <motion.div
          style={{ opacity: buttonOpacity, y: buttonY, pointerEvents: buttonPointerEvents }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <GetStartedButton size="lg">
            {/* TextPressure wants an explicitly-sized container (it reads
                its own bounding box to compute font size), not the
                button's natural content-sized width -- so this is a fixed
                w/h box sitting inside the pill instead of plain text.
                Scaled well down from the component's own demo sizing
                (which assumes a few hundred px of height) to fit a button,
                and only the weight axis is left on: Geist Sans is a
                weight-only variable font, so width/italic pressure would
                just be inert.

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
