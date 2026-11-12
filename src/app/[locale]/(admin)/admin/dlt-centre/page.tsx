import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { serviceTitle } from "@/lib/licence-verification/copy";
import { dltCentreOverview } from "@/lib/dlt-package/service";

export const dynamic = "force-dynamic";

const CARDS = [
  ["awaitingGeneration", "Packages awaiting generation"],
  ["readyToPrint", "Packages ready to print"],
  ["needsCorrections", "Packages requiring corrections"],
  ["awaitingBooking", "Appointments awaiting booking"],
  ["confirmed", "Confirmed appointments"],
  ["today", "Today's DLT appointments"],
  ["completed", "Completed applications"],
  ["failed", "Failed or postponed applications"],
] as const;

export default async function DltCentrePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const data = await dltCentreOverview();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DLT Document & Appointment Centre</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Prepare a print package after the application is approved and the invoice is issued. Book the visit in DLT Smart Queue, then record the confirmation here.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/dlt-centre/schedule" className="rounded-lg border px-3 py-2 text-sm font-semibold">Schedule</Link>
          <Link href="/admin/dlt-centre/offices" className="rounded-lg border px-3 py-2 text-sm font-semibold">Offices</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(([key, label]) => (
          <div key={key} className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{data.stats[key]}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Appointment</th>
            </tr>
          </thead>
          <tbody>
            {data.applications.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2"><Link className="font-semibold text-siam-blue" href={`/admin/licence-verification/${row.id}/package`}>{row.referenceNumber}</Link></td>
                <td className="px-3 py-2">{row.applicant?.fullLegalName ?? row.email}</td>
                <td className="px-3 py-2">{serviceTitle(row.serviceKind, "en")}</td>
                <td className="px-3 py-2">{row.packages[0]?.status ?? "Not generated"}</td>
                <td className="px-3 py-2">{row.appointments[0]?.status ?? "Not booked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
