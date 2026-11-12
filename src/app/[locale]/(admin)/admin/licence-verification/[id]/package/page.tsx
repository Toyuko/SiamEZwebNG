import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { DltPackageClient } from "@/components/licence/DltPackageClient";
import { LicenceFileTabs } from "@/components/licence/LicenceFileTabs";
import { getDltFile } from "@/lib/dlt-package/service";
import { QUOTATION_ALLOWED_STATUSES } from "@/lib/licence-verification/types";

export const dynamic = "force-dynamic";

export default async function DltPackagePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const { application } = await getDltFile(id);
  if (!application) notFound();
  const latest = application.packages[0];
  const manifest = (latest?.manifest ?? null) as { documents?: Array<{ id: string; label: string; fileName: string; duplicate: boolean }> } | null;
  const issues = Array.isArray(latest?.issues) ? (latest.issues as Array<{ code: string; message: string }>) : [];
  const acknowledged = new Set(application.findingAcks.map((ack) => ack.findingKey));
  return (
    <div className="space-y-4">
      <Link href="/admin/dlt-centre" className="text-sm font-semibold text-siam-blue">DLT centre</Link>
      <LicenceFileTabs id={id} current="package" />
      <DltPackageClient
        applicationId={application.id}
        approved={QUOTATION_ALLOWED_STATUSES.includes(application.status as (typeof QUOTATION_ALLOWED_STATUSES)[number])}
        packageId={latest?.id ?? null}
        version={latest?.version ?? null}
        status={latest?.status ?? null}
        issues={issues}
        documents={manifest?.documents ?? []}
        prints={(latest?.prints ?? []).map((print) => ({ kind: print.kind, createdAt: print.createdAt.toISOString() }))}
        findings={(application.assessments[0]?.findings ?? []).map((finding) => {
          const key = `${finding.code}:${finding.documentType ?? ""}`;
          return { key, status: finding.status, message: finding.message, acknowledged: acknowledged.has(key) };
        })}
      />
    </div>
  );
}
