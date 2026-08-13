import { CadenceMarkSection } from "@/components/cadence-mark-section";
import { ColorBendsBackground } from "@/components/ColorBendsBackground";
import { CurvedLoopMarquee } from "@/components/CurvedLoopMarquee";
import { HeroContent } from "@/components/hero-content";
import { SiteNav } from "@/components/site-nav";
import { StatCards } from "@/components/stat-cards";

// This stays a Server Component -- only the ColorBends background and the
// animated copy need to be Client Components. Keeping this file server-only
// means the page shell ships without waiting on the WebGL or motion bundles.
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col bg-black">
      {/* Constant, looping ambient background for the whole page (not just
          the hero) -- fixed at z-0, see ColorBendsBackground for why every
          section below stacks above it without extra z-index gymnastics. */}
      <ColorBendsBackground />

      <SiteNav />

      {/* Hero: the only section that needs its own overflow-hidden + full
          viewport height, since it's what pins the local vignette. Everything
          below is normal document flow, which is what makes the page
          scrollable at all. */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.55) 75%), linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.75))",
          }}
        />

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-32">
          <HeroContent />
        </main>

        {/* Marquee flourish under the hero, still inside its section so it
            sits above the same vignette (z-10, same as `main`) instead of
            being dimmed by it. Below the centered hero content, not beside
            it, so there's no risk of overlapping the headline at any
            viewport width. */}
        <CurvedLoopMarquee className="relative z-10 pb-10" />
      </section>

      {/* "What Cadence does," in numbers -- a standard scroll-into-view
          reveal, not tied to any pinned-scroll mechanism. */}
      <StatCards />

      {/* Second marquee instance -- identical component, so it automatically
          reads as the same flourish, not a different one -- as a closing
          beat right before the page's actual closing section (the "C" mark
          + its own "Get started" CTA). */}
      <CurvedLoopMarquee className="relative z-10 py-16" />

      {/* Signature moment: the "C" mark illuminates in three scroll-pinned
          segments, ending in its own "Get started" -- this is the page's
          closing section, no separate CTA block after it. */}
      <CadenceMarkSection />
    </div>
  );
}
