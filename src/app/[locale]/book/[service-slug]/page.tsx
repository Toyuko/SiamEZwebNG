import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getOrEnsureServiceBySlug } from "@/data-access/service";
import { hasWizardEngine } from "@/config/wizards";
import { getSession } from "@/lib/auth";
import { VehicleWizardBanner } from "@/components/vehicle-intake/VehicleWizardBanner";

/**
 * Defer the WizardEngine client graph (RHF, step renderers, documents) so the
 * book route shell paints first. Do not pass WizardConfig from this RSC —
 * it may include non-serializable `buildFormData`.
 */
const WizardEngine = dynamic(
  () =>
    import("@/components/wizard/WizardEngine").then((m) => m.WizardEngine),
  {
    loading: () => (
      <div
        className="min-h-[100dvh] animate-pulse bg-[linear-gradient(180deg,#EEF5FF_0%,#FFFFFF_42%)]"
        aria-busy="true"
        aria-label="Loading booking form"
      >
        <div className="mx-auto max-w-5xl px-4 pt-20">
          <div className="h-8 w-2/3 rounded-lg bg-[#DCE6F5]" />
          <div className="mt-4 h-4 w-1/2 rounded bg-[#DCE6F5]" />
          <div className="mt-8 h-64 rounded-2xl border border-[#DCE6F5] bg-white" />
        </div>
      </div>
    ),
  }
);

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
  const service = await getOrEnsureServiceBySlug(serviceSlug);
  if (!service) notFound();
  // Config (incl. buildFormData) is resolved inside WizardEngine on the client —
  // passing it from this Server Component breaks RSC serialization.
  if (!hasWizardEngine(serviceSlug)) notFound();

  return (
    <>
      <VehicleWizardBanner serviceSlug={serviceSlug} />
      <WizardEngine
        service={service}
        serviceSlug={serviceSlug}
        userId={session?.user.id}
        userEmail={session?.user.email ?? undefined}
        userName={session?.user.name ?? undefined}
      />
    </>
  );
}
