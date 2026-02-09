import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getServiceBySlug } from "@/data-access/service";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  const t = await getTranslations("services");
  if (!service) return { title: t("serviceMetaTitle") };
  return {
    title: service.name,
    description: service.shortDescription ?? service.description.slice(0, 160),
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [service, t, tCommon] = await Promise.all([
    getServiceBySlug(slug),
    getTranslations("services"),
    getTranslations("common"),
  ]);
  if (!service) notFound();

  const isFixed = service.type === "fixed";
  const hasPrice = service.priceAmount != null;

  return (
    <>
      <section className="border-b border-border bg-gray-50 py-10 dark:bg-gray-800/50 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-siam-blue">
              <Link href="/services" className="hover:underline">
                {tCommon("backToServices")}
              </Link>
            </p>
            <h1 className="mt-2 text-display-md font-bold tracking-tight text-foreground">
              {service.name}
            </h1>
            {service.shortDescription && (
              <p className="mt-3 text-lg text-muted">
                {service.shortDescription}
              </p>
            )}
            {hasPrice && (
              <p className="mt-3 text-xl font-semibold text-siam-blue">
                {isFixed
                  ? formatCurrency(service.priceAmount!, service.priceCurrency ?? "THB")
                  : `${t("from")} ${formatCurrency(service.priceAmount!, service.priceCurrency ?? "THB")} (quote-based)`}
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-10 sm:py-14">
        <div className="max-w-3xl">
          <div className="prose prose-lg prose-gray max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap text-foreground">{service.description}</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild variant="primary" size="lg">
              <Link href={`/booking/${service.slug}`}>{tCommon("bookThisService")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/services">{tCommon("backToServicesLink")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
