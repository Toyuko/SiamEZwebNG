import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { LicenceRequirementsEditor } from "@/components/licence/LicenceRequirementsEditor";
import { listLicenceRequirements } from "@/lib/licence-verification/service";

export const dynamic = "force-dynamic";

export default async function LicenceRequirementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const rules = await listLicenceRequirements();
  return (
    <div className="space-y-4">
      <Link href="/admin/licence-verification" className="text-sm font-semibold text-siam-blue">Back to centre</Link>
      <LicenceRequirementsEditor rules={rules} />
    </div>
  );
}
