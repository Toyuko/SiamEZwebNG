import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { DltAppointmentClient } from "@/components/licence/DltAppointmentClient";
import { LicenceFileTabs } from "@/components/licence/LicenceFileTabs";
import { getDltFile } from "@/lib/dlt-package/service";
import { QUOTATION_ALLOWED_STATUSES } from "@/lib/licence-verification/types";

export const dynamic = "force-dynamic";

export default async function DltAppointmentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const { application, offices, staff } = await getDltFile(id);
  if (!application) notFound();
  const current = application.appointments[0];
  return (
    <div className="space-y-4">
      <Link href="/admin/dlt-centre" className="text-sm font-semibold text-siam-blue">DLT centre</Link>
      <LicenceFileTabs id={id} current="appointment" />
      <DltAppointmentClient
        applicationId={application.id}
        serviceKind={application.serviceKind}
        approved={QUOTATION_ALLOWED_STATUSES.includes(application.status as (typeof QUOTATION_ALLOWED_STATUSES)[number])}
        offices={offices.map((office) => ({
          id: office.id,
          nameEn: office.nameEn,
          province: office.province,
          active: office.active,
          supportedServiceKinds: office.supportedServiceKinds,
        }))}
        staff={staff.map((person) => ({ id: person.id, name: person.name, email: person.email }))}
        current={{
          officeId: current?.officeId ?? "",
          appointmentDate: current?.appointmentDate ?? "",
          appointmentTime: current?.appointmentTime ?? "",
          confirmationNumber: current?.confirmationNumber ?? "",
          bookingMethod: current?.bookingMethod ?? "smart_queue_web",
          status: current?.status ?? "NOT_BOOKED",
          specialInstructions: current?.specialInstructions ?? "",
          assignedStaffId: current?.assignedStaffId ?? "",
        }}
      />
    </div>
  );
}
