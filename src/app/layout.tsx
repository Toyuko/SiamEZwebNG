import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { site } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans bg-background text-foreground">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
