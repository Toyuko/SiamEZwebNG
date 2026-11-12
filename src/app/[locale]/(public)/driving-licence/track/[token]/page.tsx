import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LicenceTrackClient } from "@/components/licence/LicenceTrackClient";
import { getByAccessToken } from "@/lib/licence-verification/service";

export const dynamic = "force-dynamic";

export default async function LicenceTrackPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const application = await getByAccessToken(token);
  if (!application) notFound();
  return (
    <LicenceTrackClient
      locale={locale}
      token={token}
      application={{
        referenceNumber: application.referenceNumber,
        serviceKind: application.serviceKind,
        status: application.status,
        email: application.email,
        applicant: application.applicant ? { fullLegalName: application.applicant.fullLegalName } : null,
        documents: application.documents,
        assessment: application.assessment
          ? {
              outcome: application.assessment.outcome,
              confidence: application.assessment.confidence,
              summary: application.assessment.summary,
              nextSteps: application.assessment.nextSteps,
              disclaimer: application.assessment.disclaimer,
              findings: application.assessment.findings,
            }
          : null,
        quote: application.quote,
        booking: application.booking ? { caseNumber: application.booking.caseNumber } : null,
        appointment: application.appointment,
      }}
    />
  );
}
