import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "SiamEZ – Professional Services in Thailand", template: "%s | SiamEZ" },
  description:
    "Professional help for your life in Thailand. Visas, business registration, legal, relocation, and more. Making life in Thailand EZ.",
  keywords: ["Thailand", "visa", "relocation", "Bangkok", "expat", "SiamEZ", "professional services"],
  openGraph: {
    title: "SiamEZ – Professional Services in Thailand",
    description: "Making life in Thailand EZ. Your trusted partner for visas, relocation, and more.",
    url: site.url,
    siteName: "SiamEZ",
  },
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
