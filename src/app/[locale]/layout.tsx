import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { rootFontClassName } from "@/lib/fonts";
import { AnalyticsScripts, GtmNoscript } from "@/components/seo/AnalyticsScripts";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={rootFontClassName} suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans bg-background text-foreground">
        <GtmNoscript />
        <AnalyticsScripts />
        <JsonLdScript data={[organizationJsonLd(), localBusinessJsonLd(), websiteJsonLd()]} />
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
