import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { DltOfficeEditor } from "@/components/licence/DltOfficeEditor";
import { listDltOffices } from "@/lib/dlt-package/service";

export const dynamic = "force-dynamic";

export default async function DltOfficesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const offices = await listDltOffices();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">DLT offices</h1>
        <Link href="/admin/dlt-centre" className="text-sm font-semibold text-siam-blue">Back to centre</Link>
      </div>
      <p className="max-w-2xl text-sm text-gray-600">
        An office can only be selected for the licence services listed on it. Addresses stay blank until staff confirm the branch shown in DLT Smart Queue.
      </p>
      <DltOfficeEditor
        offices={offices.map((office) => ({
          id: office.id,
          nameEn: office.nameEn,
          nameTh: office.nameTh,
          province: office.province,
          address: office.address,
          phone: office.phone,
          email: office.email,
          supportedServiceKinds: office.supportedServiceKinds,
          openingHours: office.openingHours,
          bookingInstructions: office.bookingInstructions,
          specialRequirements: office.specialRequirements,
          active: office.active,
        }))}
      />
    </div>
  );
}
