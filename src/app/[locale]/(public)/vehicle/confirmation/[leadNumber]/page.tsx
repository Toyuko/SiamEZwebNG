import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { getVehicleLeadByNumber } from "@/data-access/vehicle-leads";
import { getVehicleServicePricing } from "@/lib/vehicle-leads/pricing";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata = { robots: noindexRobots };

export default async function VehicleConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; leadNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, leadNumber } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);
  const [t, lead, pricing] = await Promise.all([
    getTranslations("vehicleIntake"),
    getVehicleLeadByNumber(leadNumber, token),
    getVehicleServicePricing(),
  ]);
  if (!lead) notFound();

  const timeframe =
    pricing.responseTimeframeCopy ||
    (pricing.expectedResponseHours
      ? t("responseHours", { hours: pricing.expectedResponseHours })
      : t("responseSoon"));

  return (
    <section className="container mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">{t("thanksTitle")}</h1>
      <p className="mt-2 text-muted">{t("thanksBody")}</p>
      <dl className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <dt className="text-xs uppercase text-muted">{t("requestNumber")}</dt>
          <dd className="font-semibold">{lead.leadNumber}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">{t("vehicleSummary")}</dt>
          <dd>{lead.displayTitle}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">{t("whatNext")}</dt>
          <dd className="text-sm">{t("whatNextBody")}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">{t("timeframe")}</dt>
          <dd className="text-sm">{timeframe}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild size="lg">
          <a href={site.lineUrl} target="_blank" rel="noopener noreferrer">
            {t("contactLine")}
          </a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{t("callSiamEZ")}</a>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </section>
  );
}
