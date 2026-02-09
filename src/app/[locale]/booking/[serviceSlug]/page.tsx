import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getServiceBySlug } from "@/data-access/service";
import { Button } from "@/components/ui/button";
import { BookingWizard } from "@/components/booking/BookingWizard";

export default async function BookingWizardPage({
  params,
}: {
  params: Promise<{ locale: string; serviceSlug: string }>;
}) {
  const { locale, serviceSlug } = await params;
  setRequestLocale(locale);
  const [service, t, tCommon] = await Promise.all([
    getServiceBySlug(serviceSlug),
    getTranslations("booking"),
    getTranslations("common"),
  ]);
  if (!service) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t("book", { name: service.name })}
        </h1>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/services/${serviceSlug}`}>{tCommon("cancel")}</Link>
        </Button>
      </div>
      <BookingWizard service={service} />
    </div>
  );
}
