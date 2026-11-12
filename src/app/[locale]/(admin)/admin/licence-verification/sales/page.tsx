import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { serviceTitle } from "@/lib/licence-verification/copy";
import { licenceUploadSalesReport } from "@/lib/licence-verification/upload-request";
import type { LicenceServiceKind } from "@/lib/licence-verification/types";

export const dynamic = "force-dynamic";

function one(query: Record<string, string | string[] | undefined>, key: string) {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LicenceUploadReportPage({
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
  const report = await licenceUploadSalesReport({
    salesRepId: one(query, "rep"),
    from: one(query, "from"),
    to: one(query, "to"),
  });
  const metrics = [
    ["Requests sent", report.requestsSent],
    ["Links opened", report.linksOpened],
    ["Submitted", report.submitted],
    ["AI pass", report.aiPass],
    ["Corrections", report.corrections],
    ["Approved for quotation", report.approvedForQuotation],
    ["Paid or booking confirmed", report.convertedPaid],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Driving licence upload report</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Links sent from the sales chat, through AI screening, to a staff-approved quotation. An AI pass is not counted as paid.
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Send the upload link from WhatsApp, Facebook, or LINE</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Copy the message in the command centre, paste it into the chat you already use, then check the file when the customer uploads it.
          </p>
          <a className="mt-2 inline-block text-sm font-semibold text-siam-blue" href="/api/licence-verification/sales-walkthrough?download=1">
            Download this video
          </a>
        </div>
        <video
          className="aspect-video w-full bg-black"
          controls
          preload="metadata"
          src="/api/licence-verification/sales-walkthrough"
        >
          Your browser cannot play this video.
        </video>
      </section>
      <form className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-4 dark:border-gray-700 dark:bg-gray-900" method="get">
        <label className="text-sm">From
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" name="from" defaultValue={one(query, "from") ?? ""} />
        </label>
        <label className="text-sm">To
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" name="to" defaultValue={one(query, "to") ?? ""} />
        </label>
        <label className="text-sm">Sales rep
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="rep" defaultValue={one(query, "rep") ?? ""}>
            <option value="">Everyone</option>
            {report.reps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name || rep.email}</option>
            ))}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-lg bg-[#2c54c6] px-4 text-sm font-semibold text-white" type="submit">Filter</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[#2c54c6]">{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Sent</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Link</th>
              <th className="px-3 py-2">AI</th>
              <th className="px-3 py-2">Application</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Paid</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 whitespace-nowrap">{row.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2">{row.customerName}</td>
                <td className="px-3 py-2">
                  <Link className="text-[#2c54c6] underline" href={`/admin/licence-verification/${row.applicationId}`}>{row.referenceNumber}</Link>
                </td>
                <td className="px-3 py-2">{serviceTitle(row.serviceKind as LicenceServiceKind, "en")}</td>
                <td className="px-3 py-2">{row.linkStatus}</td>
                <td className="px-3 py-2">{row.outcome ?? "—"}</td>
                <td className="px-3 py-2">{row.applicationStatus.replaceAll("_", " ").toLowerCase()}</td>
                <td className="px-3 py-2">{row.salesRep}</td>
                <td className="px-3 py-2">{row.paid ? "Yes" : "No"}</td>
              </tr>
            ))}
            {report.rows.length === 0 ? (
              <tr><td className="px-3 py-6 text-gray-500" colSpan={9}>No upload requests in this filter.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
