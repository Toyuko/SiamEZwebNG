import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { DltVisitClient } from "@/components/licence/DltVisitClient";
import { LicenceFileTabs } from "@/components/licence/LicenceFileTabs";
import { getDltFile } from "@/lib/dlt-package/service";

export const dynamic = "force-dynamic";

export default async function DltCompletionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const { application } = await getDltFile(id);
  if (!application) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/dlt-centre" className="text-sm font-semibold text-siam-blue">DLT centre</Link>
      <LicenceFileTabs id={id} current="completion" />
      <DltVisitClient
        applicationId={application.id}
        visits={application.visits.map((visit) => ({
          id: visit.id,
          outcome: visit.outcome,
          feedback: visit.feedback,
          additionalRequirements: visit.additionalRequirements,
          nextAppointmentDate: visit.nextAppointmentDate,
          notes: visit.notes,
          createdAt: visit.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
