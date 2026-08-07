import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { BootIntro } from "@/components/BootIntro";
import { GetStartedTransitionProvider } from "@/components/GetStartedTransition";
import { PageTransition } from "@/components/page-transition";

// Two-family system: Space Grotesk for anything that has to announce
// itself (headlines, section titles, the nav wordmark), Inter for
// everything you actually read (body copy, labels, form inputs).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cadence — AI SDR that remembers",
  description:
    "AI SDR that writes hyper-personalized cold outreach and remembers past touchpoints to adjust tone over time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
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
