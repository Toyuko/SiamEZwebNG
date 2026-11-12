import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { LICENCE_SERVICE_KINDS } from "@/lib/licence-verification/types";
import { serviceTitle } from "@/lib/licence-verification/copy";
import { listLicenceApplications } from "@/lib/licence-verification/service";

export const dynamic = "force-dynamic";

const STATUSES = [
  "AWAITING_DOCUMENTS",
  "AI_IN_PROGRESS",
  "READY_FOR_STAFF_REVIEW",
  "CORRECTIONS_REQUIRED",
  "MANUAL_REVIEW",
  "APPROVED_FOR_QUOTATION",
  "QUOTATION_SENT",
  "BOOKING_CONFIRMED",
  "REJECTED",
] as const;

const LABELS: Record<string, string> = {
  AWAITING_DOCUMENTS: "Awaiting document uploads",
  AI_IN_PROGRESS: "AI assessment in progress",
  READY_FOR_STAFF_REVIEW: "Ready for staff review",
  CORRECTIONS_REQUIRED: "Customer corrections required",
  MANUAL_REVIEW: "Manual review required",
  APPROVED_FOR_QUOTATION: "Approved for quotation",
  QUOTATION_SENT: "Quotation sent",
  BOOKING_CONFIRMED: "Converted into bookings",
  REJECTED: "Rejected applications",
};

export default async function LicenceVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isAdminAuthBypassEnabled()) await requireStaff();
  const query = await searchParams;
  const one = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const data = await listLicenceApplications({
    status: one("status"),
    serviceKind: one("service"),
    nationality: one("nationality"),
    outcome: one("result"),
    staffId: one("staff"),
    from: one("from"),
    to: one("to"),
  });
  const total = Object.values(data.counts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Licence Verification Centre</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Screen driving licence documents before a quotation or invoice is issued.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/licence-verification/sales" className="rounded-lg border border-siam-blue px-3 py-2 text-sm font-semibold text-siam-blue">
            Upload report
          </Link>
          <Link href="/admin/licence-verification/requirements" className="rounded-lg border border-siam-blue px-3 py-2 text-sm font-semibold text-siam-blue">
            Requirements
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total applications" value={total} />
        {STATUSES.map((status) => (
          <Stat key={status} label={LABELS[status]} value={data.counts[status] ?? 0} />
        ))}
      </div>
      <form className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-3 dark:border-gray-700 dark:bg-gray-900" method="get">
        <label className="text-sm">From<input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" name="from" defaultValue={one("from")} /></label>
        <label className="text-sm">To<input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" name="to" defaultValue={one("to")} /></label>
        <label className="text-sm">Service
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="service" defaultValue={one("service") ?? ""}>
            <option value="">All</option>
            {LICENCE_SERVICE_KINDS.map((kind) => <option key={kind} value={kind}>{serviceTitle(kind, "en")}</option>)}
          </select>
        </label>
        <label className="text-sm">Status
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="status" defaultValue={one("status") ?? ""}>
            <option value="">All</option>
            {STATUSES.map((status) => <option key={status} value={status}>{LABELS[status]}</option>)}
          </select>
        </label>
        <label className="text-sm">Nationality<input className="mt-1 w-full rounded-lg border px-3 py-2" name="nationality" defaultValue={one("nationality")} /></label>
        <label className="text-sm">Assessment
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="result" defaultValue={one("result") ?? ""}>
            <option value="">All</option>
            <option value="PASS">Pass</option>
            <option value="ACTION_REQUIRED">Action required</option>
            <option value="MANUAL_REVIEW">Manual review</option>
          </select>
        </label>
        <button className="rounded-lg bg-siam-blue px-4 py-2 font-semibold text-white md:col-span-3" type="submit">Apply filters</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Staff</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-3 py-3"><Link className="font-semibold text-siam-blue" href={`/admin/licence-verification/${row.id}`}>{row.referenceNumber}</Link></td>
                <td className="px-3 py-3">{row.name}<div className="text-xs text-gray-500">{row.nationality}</div></td>
                <td className="px-3 py-3">{serviceTitle(row.serviceKind, "en")}</td>
                <td className="px-3 py-3">{LABELS[row.status] ?? row.status}</td>
                <td className="px-3 py-3">{row.outcome ?? "—"}</td>
                <td className="px-3 py-3">{row.assignee ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
