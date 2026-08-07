import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/page-transition";
import { TransitionOverlayProvider } from "@/components/transition-overlay";

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
        {/* Provider wraps PageTransition, not the other way around -- it has
            to survive the pathname change it triggers, and PageTransition
            unmounts its previous-route content on every navigation. */}
        <TransitionOverlayProvider>
          <PageTransition>{children}</PageTransition>
        </TransitionOverlayProvider>
      </body>
    </html>
  );
}
