"use client";

import Topography from "@/components/react-bits/Topography";

const LOW = "#10B981";
const MID = "#09db95";
const HIGH = "#06B6D4";

/**
 * Constant, looping ambient background for the dashboard -- fixed,
 * full-bleed (via `fixed inset-0`, not a hardcoded pixel size), z-0, so it
 * sits behind every dashboard section without any dashboard content needing
 * its own z-index gymnastics (same convention as the landing page's
 * ColorBendsBackground). Unlike ColorBends, Topography already pauses its
 * own rAF loop internally on tab-hide (Page Visibility) and when scrolled
 * out of view (IntersectionObserver) -- see components/react-bits/
 * Topography.tsx -- so it's rendered directly here, no unmount-on-hidden
 * wrapper needed.
 */
export function DashboardTopographyBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <Topography
        lowColor={LOW}
        midColor={MID}
        highColor={HIGH}
        speed={0.25}
        morphAmount={2.6}
        morphSpeed={0.05}
        bands={2}
        thickness={0.01}
        scale={1}
        pixelSize={1}
        glow={0.5}
        colorMode="elevation"
        contrast={3}
        brightness={1}
        fillBands={false}
        opacity={1}
        grain
        grainIntensity={0.05}
        mouseInteraction
        mouseRadius={0.3}
        mouseStrength={0.4}
      />

      {/* Modest full-page darkening -- the dashboard is text-dense (form
          labels, placeholders, paragraphs) everywhere, not just near one
          focal point, so this is a flat overlay rather than the landing
          page's radial vignette. Deliberately not too strong: the cards
          themselves carry the real legibility work (solid glass fill +
          backdrop-blur, see prospect-card.tsx/result-card.tsx), so this
          only needs to take the edge off the pattern for the page's own
          background text, not black it out. */}
      <div aria-hidden className="absolute inset-0 bg-black/45" />
    </div>
  );
}
