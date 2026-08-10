import Image from "next/image";

// Trimmed to the glyphs' own bounding box (+ generous padding) from the
// original public/cadence-logo.png -- that file is a 500x500 canvas with
// the actual "CADENCE" wordmark occupying only a ~210x27px sliver in the
// middle. Cropped so a nav-sized box doesn't have to fight a huge amount
// of dead transparent space around the actual mark.
const LOGO_SRC = "/cadence-logo-trimmed.png";
const LOGO_ASPECT = 284 / 101; // trimmed file's own width/height

/**
 * Nav wordmark: the plain transparent CADENCE logo, no effect.
 *
 * React Bits' MetallicPaint was tried here first (tintColor #10B981) per
 * the original ask, and rejected after live testing: this wordmark's
 * letterforms are thin, evenly-stroked, and widely spaced (a ~2-4px stroke
 * width even in the source file), which is a poor match for a shader whose
 * highlight/shadow pattern is computed from a boundary-distance field
 * inside each glyph -- strokes that thin have almost no "interior" pixels
 * far from an edge, so the computed depth map is nearly flat. The result
 * (checked at both actual nav size and blown up to 500px for inspection)
 * had letter-to-letter contrast so inconsistent that some letters read as
 * bright white/cyan and others were nearly invisible against black, with
 * no cohesive tint despite tintColor being set -- illegible at nav size,
 * not just "less crisp." A legible logo beats a muddy effected one, so
 * this renders the plain image instead. See git history for the
 * MetallicPaint wiring that was removed.
 */
export function CadenceWordmark({ heightPx = 28, className }: { heightPx?: number; className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Cadence"
      width={Math.round(heightPx * LOGO_ASPECT)}
      height={heightPx}
      // Inline style, not a Tailwind height class: next/image's dev-mode
      // aspect-ratio check only inspects the rendered `style` attribute, so
      // controlling size through a Tailwind class it can't see trips a
      // (harmless but noisy) console warning every render.
      style={{ width: "auto", height: `${heightPx}px` }}
      className={className}
      priority
    />
  );
}
