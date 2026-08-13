import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { site } from "@/config/site";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ContactRequestForm } from "@/components/sections/ContactRequestForm";
import { OfficeLocator } from "@/components/sections/OfficeLocator";
import { TrackedContactLink } from "@/components/seo/TrackedContactLink";
import { getGoogleMapsApiKey, officeGoogleMapsUrl } from "@/lib/maps";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { canonicalUrl } from "@/lib/seo/urls";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return buildPageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([
    getTranslations("contact"),
    getTranslations("common"),
  ]);
  const mapsApiKey = getGoogleMapsApiKey() ?? "";
  const mapsUrl = officeGoogleMapsUrl();

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            url: canonicalUrl(locale, "/contact"),
            name: t("metaTitle"),
            description: t("metaDescription"),
            locale,
          }),
          breadcrumbListJsonLd([
            { name: tCommon("home"), url: canonicalUrl(locale, "") },
            { name: t("title"), url: canonicalUrl(locale, "/contact") },
          ]),
        ]}
      />
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6">
            <TrackedContactLink
              href={`mailto:${site.email}`}
              event="email_clicked"
              source="contact_page"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("emailUs")}</p>
                <p className="text-siam-blue">{site.email}</p>
              </div>
            </TrackedContactLink>
            <TrackedContactLink
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              event="phone_clicked"
              source="contact_page"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("callUs")}</p>
                <p className="text-siam-blue">{site.phone}</p>
              </div>
            </TrackedContactLink>
            <TrackedContactLink
              href={site.lineUrl}
              event="line_clicked"
              source="contact_page"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("lineOfficial")}</p>
                <p className="text-siam-blue">{site.line}</p>
              </div>
            </TrackedContactLink>
            <TrackedContactLink
              href={mapsUrl}
              event="maps_clicked"
              source="contact_page"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("visitUs")}</p>
                <p className="text-siam-blue">{site.address.line1}</p>
                <p className="text-siam-blue">{site.address.line2}</p>
                <p className="mt-1 text-sm text-muted">{t("openInMaps")}</p>
              </div>
            </TrackedContactLink>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-foreground">{t("bookService")}</h2>
            <ContactRequestForm />
          </div>
        </div>
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">{t("findUs")}</h2>
          <p className="mt-2 text-muted">{t("findUsDescription")}</p>
          <div className="mt-6">
            <OfficeLocator apiKey={mapsApiKey} locale={locale} />
          </div>
        </div>
        <p className="mt-8 text-center text-muted">
          {t("preferBookOnline")}{" "}
          <Link href="/portal" className="font-medium text-siam-blue hover:underline">
            {tCommon("goToClientPortal")}
          </Link>
        </p>
      </section>
    </>
  );
}
