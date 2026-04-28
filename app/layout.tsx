import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daily Morning Brief — Roy McFarland",
  description:
    "An autonomous decision-grade briefing delivered to your inbox every morning at 6:00 Mountain. Built for operators who need signal, not noise.",
  metadataBase: new URL("https://www.roymcfarland.news"),
  openGraph: {
    title: "Daily Morning Brief",
    description:
      "Decision-grade signal across AI, markets, business, cannabis, Chicago, Colorado, and one asymmetric bet — every morning at 6:00 Mountain.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Morning Brief",
    description:
      "Decision-grade signal across AI, markets, business, cannabis, Chicago, Colorado, and one asymmetric bet — every morning at 6:00 Mountain.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5efe2",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
