"use client";

import { useSyncExternalStore } from "react";
import Ferrofluid from "@/components/react-bits/Ferrofluid";

// Vendor exposes one `colors` array, not the color1/color2/color3 props --
// same lime -> emerald -> emerald ramp, adapted to that actual signature.
const COLORS = ["#84CC16", "#10B981", "#10B981"];

// Same Page Visibility unmount pattern as ColorBendsBackground.tsx -- see
// that file for why unmounting (not Ferrofluid's own `paused` prop) is what
// actually cancels the rAF loop and frees the WebGL context. `paused` alone
// still schedules a requestAnimationFrame every single frame, it just skips
// the render call inside it -- not good enough when this is one of two
// concurrent WebGL canvases on the page.
function subscribeToVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
function getVisibilitySnapshot() {
  return !document.hidden;
}
function getVisibilityServerSnapshot() {
  return true;
}

/**
 * One shared ambient accent behind the whole "add prospects" work area (the
 * card list + add/generate row) -- deliberately a single instance, not one
 * per ProspectCard. A WebGL canvas per card would mean up to MAX_PROSPECTS
 * extra contexts running concurrently on top of the page's own Topography
 * background, which is exactly the typing-time jank this needs to avoid.
 *
 * Rendered by the caller inside a `relative` wrapper as `absolute inset-0`,
 * so it sizes itself to that wrapper's actual (variable-height) content in
 * normal flow -- adding another prospect just grows the area this same
 * instance covers, nothing new ever mounts.
 *
 * Low opacity and no mouse interaction on purpose: this is meant to read as
 * a faint accent glowing behind/between the cards, not a focal effect --
 * the cards' own solid bg-black/60 glass keeps every input fully readable
 * over it, and skipping the mouse-follow glow removes one more per-frame
 * cost + a pointermove listener from a page whose main job is being typed
 * into.
 */
export function ProspectsFerrofluidAccent() {
  const tabVisible = useSyncExternalStore(subscribeToVisibility, getVisibilitySnapshot, getVisibilityServerSnapshot);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {tabVisible && <Ferrofluid colors={COLORS} opacity={0.2} mouseInteraction={false} />}
    </div>
  );
}
