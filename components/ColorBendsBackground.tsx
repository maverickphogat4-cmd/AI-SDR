"use client";

import { useSyncExternalStore } from "react";
import ColorBends from "@/components/react-bits/ColorBends";

const ACCENT = "#10B981"; // site's teal/emerald accent -- kept monochrome on purpose

// `useSyncExternalStore` plumbing for the Page Visibility API. Same pattern
// as prefers-reduced-motion (components/hero-scene.tsx) and the boot-seen
// flag (components/BootIntro.tsx) -- read an external, subscribable value
// without a setState-in-effect footgun, with a safe SSR snapshot for free.
function subscribeToVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
function getVisibilitySnapshot() {
  return !document.hidden;
}
function getVisibilityServerSnapshot() {
  // No `document` on the server -- assume visible; the client snapshot
  // reconciles immediately after hydration if the tab is actually hidden.
  return true;
}

/**
 * Constant, looping ambient background for the landing page (replaces the
 * old hero-only particle-network canvas, components/hero-scene.tsx). Fixed
 * full-bleed at z-0, so it sits behind every section -- nav (z-40), hero
 * content (z-10), and the "C" mark section (also given z-10, see
 * components/cadence-mark-section.tsx) all stack above it automatically.
 *
 * ColorBends has no built-in Page Visibility handling of its own -- pausing
 * on tab-hide is done here by unmounting it: that runs its own cleanup
 * (cancels the rAF loop, disposes the WebGL context) for free, and
 * remounting when the tab is visible again starts a fresh one. Simpler and
 * more robust than reaching into vendored source to add a pause flag it was
 * never built to expose.
 */
export function ColorBendsBackground() {
  const tabVisible = useSyncExternalStore(subscribeToVisibility, getVisibilitySnapshot, getVisibilityServerSnapshot);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      {tabVisible && (
        <ColorBends
          colors={[ACCENT]}
          speed={0.15}
          scale={1.4}
          frequency={1}
          warpStrength={0.9}
          mouseInfluence={0.3}
          parallax={0.3}
          noise={0.05}
          iterations={1}
          intensity={2}
          bandWidth={3}
          transparent={false}
        />
      )}

      {/* Vignette so headline copy, nav, and the C-section's own text stay
          legible over the motion -- darker toward the edges/top, lighter at
          center where the effect should actually read as visible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%), linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.45))",
        }}
      />
    </div>
  );
}
