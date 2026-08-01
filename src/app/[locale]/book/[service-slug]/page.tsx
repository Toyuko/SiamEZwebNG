import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOrEnsureServiceBySlug } from "@/data-access/service";
import { Button } from "@/components/ui/button";
import { WizardEngine } from "@/components/wizard";
import { getWizardConfig } from "@/config/wizards";
import { getSession } from "@/lib/auth";

/**
 * All seeded service slugs book via Universal Wizard Engine (P3 / A06).
 * Legacy *BookingWizard components remain in the repo for reference until
 * Orchestrator confirms deletion — they are no longer selected here.
 */
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
  if (!engineConfig) notFound();

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
      <WizardEngine
        config={engineConfig}
        service={service}
        serviceSlug={serviceSlug}
        userId={session?.user.id}
        userEmail={session?.user.email ?? undefined}
        userName={session?.user.name ?? undefined}
      />
    </div>
  );
}
