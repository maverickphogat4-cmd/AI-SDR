"use client";

import CurvedLoop from "@/components/react-bits/CurvedLoop";

/**
 * The landing page's two marquee placements (top, below the hero; bottom,
 * before the closing CTA section) are one component, not two hand-tuned
 * instances -- same text/speed/styling both times, only the surrounding
 * spacing differs per call site, so "make both instances consistent" is
 * true by construction instead of by careful copy-pasting.
 *
 * `interactive={false}`: CurvedLoop ships pointer-drag scrubbing by
 * default, which reads as a toy to grab rather than an ambient brand
 * flourish -- off here so it just loops on its own.
 *
 * `className` here is the outer wrapper's (spacing only -- each call site
 * controls its own breathing room). CurvedLoop's own `className` prop lands
 * directly on its inner <text> node instead, which is where the fixed
 * fill/font-size below actually take effect: dialed down from the vendor's
 * demo-scale 6rem default, and emerald at reduced opacity so it reads as
 * accent, not a second headline.
 *
 * `curveAmount` is also dialed way down from the vendor default of 400.
 * That default is a Bezier control-point offset in the same coordinate
 * space as the component's fixed 1440x120 viewBox -- fine for the vendor's
 * own full-100vh demo section, but a bow more than 3x the viewBox's own
 * height, rendered through `overflow: visible`, produces a sag so extreme
 * it reads as broken (text ballooning far outside its own box) once this
 * is shrunk down to a thin inline strip between sections. 24 keeps a
 * gentle, legible arc instead.
 */
export function CurvedLoopMarquee({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <CurvedLoop
        marqueeText="EMAILS ✦ WRITE ✦ UNIQUE ✦"
        speed={4}
        curveAmount={24}
        interactive={false}
        className="fill-emerald-400/60 text-[2.5rem] sm:text-[3.25rem]"
      />
    </div>
  );
}
