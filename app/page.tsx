import Link from "next/link";
import HeroScene from "@/components/hero-scene";

// This stays a Server Component -- only the Three.js scene itself needs
// to be a Client Component. Keeping the copy/CTA server-rendered means
// the headline is in the initial HTML rather than waiting on the WebGL
// bundle to hydrate.
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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
        <span className="mb-6 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-medium tracking-wide text-teal-300 uppercase">
          Research-driven outreach
        </span>

        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
          AI SDR that remembers
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
          Every email is grounded in what a prospect actually said and did --
          not a template. Every follow-up adjusts its tone based on whether
          they replied last time.
        </p>

        <Link
          href="/dashboard"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-teal-400 px-8 text-base font-medium text-black transition-colors hover:bg-teal-300"
        >
          Get started
        </Link>
      </main>
    </div>
  );
}
