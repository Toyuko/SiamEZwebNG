import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOrEnsureServiceBySlug } from "@/data-access/service";
import { Button } from "@/components/ui/button";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { DriverLicenseBookingWizard } from "@/components/booking/DriverLicenseBookingWizard";
import { CarMotorbikeFinderBookingWizard } from "@/components/booking/CarMotorbikeFinderBookingWizard";
import { RealEstateBookingWizard } from "@/components/booking/RealEstateBookingWizard";
import { WizardEngine } from "@/components/wizard";
import { getWizardConfig } from "@/config/wizards";
import { getSession } from "@/lib/auth";

export default async function BookServicePage({
  params,
}: {
  params: Promise<{ locale: string; "service-slug": string }>;
}) {
  const { locale, "service-slug": serviceSlug } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  const [service, t, tCommon] = await Promise.all([
    getOrEnsureServiceBySlug(serviceSlug),
    getTranslations("booking"),
    getTranslations("common"),
  ]);
  if (!service) notFound();

  const engineConfig = getWizardConfig(serviceSlug);
  const wizardProps = {
    service,
    userId: session?.user.id,
    userEmail: session?.user.email ?? undefined,
    userName: session?.user.name ?? undefined,
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
          {t("book", { name: service.name })}
        </h1>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/services/${serviceSlug}`}>{tCommon("cancel")}</Link>
        </Button>
      </div>
      {serviceSlug === "driver-license" ? (
        <DriverLicenseBookingWizard {...wizardProps} />
      ) : serviceSlug === "car-motorbike-finder-selling-service" ? (
        <CarMotorbikeFinderBookingWizard {...wizardProps} />
      ) : serviceSlug === "real-estate-services" ? (
        <RealEstateBookingWizard {...wizardProps} />
      ) : engineConfig ? (
        <WizardEngine
          config={engineConfig}
          service={service}
          serviceSlug={serviceSlug}
          userId={wizardProps.userId}
          userEmail={wizardProps.userEmail}
          userName={wizardProps.userName}
        />
      ) : (
        <BookingWizard
          service={service}
          serviceSlug={serviceSlug}
          userId={wizardProps.userId}
          userEmail={wizardProps.userEmail}
          userName={wizardProps.userName}
        />
      )}
    </div>
  );
}
