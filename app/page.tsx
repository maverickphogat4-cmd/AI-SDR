import HeroScene from "@/components/hero-scene";
import { HeroContent } from "@/components/hero-content";

// This stays a Server Component -- only the Three.js scene and the
// animated copy need to be Client Components. Keeping this file server-only
// means the page shell ships without waiting on the WebGL or motion bundles.
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-black">
      {/* Background layer: animated constellation, sits behind everything
          and never intercepts pointer events (see hero-scene.tsx). */}
      <div className="absolute inset-0">
        <HeroScene />
      </div>

      {/* Vignette so text stays readable over the particle field regardless
          of where particles happen to drift. */}
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
    </div>
  );
}
