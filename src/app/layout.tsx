import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/config/site";
import { indexRobots } from "@/lib/seo/metadata";

const defaultTitle = "Thailand Services Made Easy";
const defaultDescription =
  "SiamEZ helps foreigners and residents in Thailand with driver's licenses, marriage registration, certified translation, vehicle registration, visas, and more.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${defaultTitle} | ${site.name}`, template: "%s | SiamEZ" },
  description: defaultDescription,
  keywords: [
    "SiamEZ",
    "Thailand services",
    "Thai driver's license",
    "marriage registration Thailand",
    "translation legalization Thailand",
    "vehicle registration Thailand",
    "expats in Thailand",
  ],
  robots: indexRobots,
  openGraph: {
    title: `${defaultTitle} | ${site.name}`,
    description: defaultDescription,
    url: site.url,
    siteName: site.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${defaultTitle} | ${site.name}`,
    description: defaultDescription,
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

/**
 * Root layout passes children through.
 * `<html>` / `<body>` live in `[locale]/layout.tsx` so `lang` is locale-correct on SSR.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
