import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { LicenceReviewClient } from "@/components/licence/LicenceReviewClient";
import { LicenceFileTabs } from "@/components/licence/LicenceFileTabs";
import { getForStaff, listAssignableStaff } from "@/lib/licence-verification/service";

export const dynamic = "force-dynamic";

export default async function LicenceReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const [application, staff] = await Promise.all([getForStaff(id), listAssignableStaff()]);
  if (!application) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/licence-verification" className="text-sm font-semibold text-siam-blue">Back to centre</Link>
      <LicenceFileTabs id={id} current="file" />
      <LicenceReviewClient application={application} staff={staff} />
    </div>
  );
}
