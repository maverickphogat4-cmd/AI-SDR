import { ExplainerSection } from "@/components/explainer-section";
import { FinalCtaSection } from "@/components/final-cta-section";
import { HeroContent } from "@/components/hero-content";
import HeroScene from "@/components/hero-scene";
import { SiteNav } from "@/components/site-nav";

// This stays a Server Component -- only the Three.js scene and the
// animated copy need to be Client Components. Keeping this file server-only
// means the page shell ships without waiting on the WebGL or motion bundles.
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col bg-black">
      <SiteNav />

      {/* Hero: the only section that needs its own overflow-hidden + full
          viewport height, since it's what pins the absolutely-positioned
          Three.js canvas and vignette. Everything below is normal document
          flow, which is what makes the page scrollable at all. */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="absolute inset-0">
          <HeroScene />
        </div>

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
      </section>

      <ExplainerSection />
      <FinalCtaSection />
    </div>
  );
}
