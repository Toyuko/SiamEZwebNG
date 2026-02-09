import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/sections/PageHero";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { getServicesList } from "@/data-access/service";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  serviceSlugs,
  serviceDisplayNames,
  serviceShortDescriptions,
} from "@/config/services";
import type { ServiceSlug } from "@/config/services";
import {
  Heart,
  FileText,
  Car,
  Shield,
  Plane,
  Wrench,
  ClipboardList,
  Bus,
  User,
} from "lucide-react";

const iconBySlug: Record<ServiceSlug, React.ComponentType<{ className?: string }>> = {
  "marriage-registration": Heart,
  "translation-services": FileText,
  "driver-license": Car,
  "police-clearance": Shield,
  "visa-services": Plane,
  "construction-handyman": Wrench,
  "vehicle-registration": ClipboardList,
  "transportation-services": Bus,
  "private-driver-service": User,
};

const iconColorBySlug: Record<ServiceSlug, { bg: string; text: string }> = {
  "marriage-registration": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
  "translation-services": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  "driver-license": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  "police-clearance": { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
  "visa-services": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  "construction-handyman": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
  "vehicle-registration": { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
  "transportation-services": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
  "private-driver-service": { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400" },
};

type DisplayService = {
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([
    getTranslations("services"),
    getTranslations("common"),
  ]);

  const services = await getServicesList().catch(() => []);
  const list: DisplayService[] =
    services.length > 0
      ? services.map((s) => ({
          slug: s.slug,
          name: s.name,
          shortDescription: s.shortDescription,
          description: s.description,
          priceAmount: s.priceAmount,
          priceCurrency: s.priceCurrency,
        }))
      : serviceSlugs.map((slug) => ({
          slug,
          name: serviceDisplayNames[slug],
          shortDescription: serviceShortDescriptions[slug],
          description: null,
          priceAmount: null,
          priceCurrency: null,
        }));

  return (
    <>
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const Icon = iconBySlug[s.slug as ServiceSlug] ?? FileText;
            const colors = iconColorBySlug[s.slug as ServiceSlug] ?? iconColorBySlug["translation-services"];
            const desc =
              s.shortDescription ?? (s.description && s.description.slice(0, 200)) ?? "";
            return (
              <Card
                key={s.slug}
                className="flex flex-col border-border shadow-sm transition hover:shadow-md"
              >
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{s.name}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {desc}
                  </p>
                  {s.priceAmount != null && (
                    <p className="mt-2 text-sm font-medium text-siam-blue">
                      {t("from")} {formatCurrency(s.priceAmount, s.priceCurrency ?? "THB")}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/services/${s.slug}`}
                      className="text-sm font-medium text-siam-blue hover:underline"
                    >
                      {tCommon("learnMoreLink")}
                    </Link>
                    <span className="text-border">|</span>
                    <Link
                      href={`/booking/${s.slug}`}
                      className="text-sm font-medium text-siam-blue hover:underline"
                    >
                      {tCommon("book")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
