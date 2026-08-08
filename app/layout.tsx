import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { BootIntro } from "@/components/BootIntro";
import { GetStartedTransitionProvider } from "@/components/GetStartedTransition";
import { PageTransition } from "@/components/page-transition";

// One variable font (weights 100-900) for everything, body and headings
// alike -- not `next/font/google` (Geist isn't in that catalog; it's
// Vercel's own font, distributed as the `geist` package, which is why this
// is a `next/font/local` loader under the hood, not `next/font/google`).
// Headings lean on the font's own heavy end (font-bold/font-extrabold +
// tracking-tight) instead of a second family, so there's one voice at two
// weights rather than two typefaces to keep in sync.

export const metadata: Metadata = {
  title: "Cadence — AI SDR that remembers",
  description:
    "AI SDR that writes hyper-personalized cold outreach and remembers past touchpoints to adjust tone over time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Site-wide, not landing-page-only: plays once per session
            regardless of which route is opened first (a shared /dashboard
            link included), then never again this session. It's a sibling,
            not a wrapper -- the rest of the tree mounts normally underneath
            it instead of waiting on it. */}
        <BootIntro />

        {/* Provider wraps PageTransition, not the other way around -- it has
            to survive the pathname change it triggers, and PageTransition
            unmounts its previous-route content on every navigation. */}
        <GetStartedTransitionProvider>
          <PageTransition>{children}</PageTransition>
        </GetStartedTransitionProvider>
      </body>
    </html>
  );
}
