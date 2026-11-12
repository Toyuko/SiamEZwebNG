import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { dltSchedule } from "@/lib/dlt-package/service";

export const dynamic = "force-dynamic";

export default async function DltSchedulePage({
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
  const data = await dltSchedule({
    date: one("date"),
    province: one("province"),
    officeId: one("office"),
    staffId: one("staff"),
  });
  const todayRows = data.rows.filter((row) => row.appointmentDate === data.today);
  const upcoming = data.rows.filter((row) => row.appointmentDate !== data.today);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">DLT schedule</h1>
          <p className="text-sm text-gray-600">Today in Bangkok: {data.today}</p>
        </div>
        <Link href="/admin/dlt-centre" className="text-sm font-semibold text-siam-blue">Back to centre</Link>
      </div>
      <form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-5 dark:bg-gray-900" method="get">
        <label className="text-sm">Date<input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" name="date" defaultValue={one("date")} /></label>
        <label className="text-sm">Province<input className="mt-1 w-full rounded-lg border px-3 py-2" name="province" defaultValue={one("province")} /></label>
        <label className="text-sm">Office
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="office" defaultValue={one("office")}>
            <option value="">All</option>
            {data.offices.map((office) => <option key={office.id} value={office.id}>{office.nameEn}</option>)}
          </select>
        </label>
        <label className="text-sm">Assigned staff
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="staff" defaultValue={one("staff")}>
            <option value="">All</option>
            {data.staff.map((person) => <option key={person.id} value={person.id}>{person.name || person.email}</option>)}
          </select>
        </label>
        <button className="self-end rounded-lg bg-siam-blue px-3 py-2 text-sm font-semibold text-white" type="submit">Filter</button>
      </form>
      <Schedule title="Today" rows={todayRows} />
      <Schedule title="Upcoming and other dates" rows={upcoming} />
    </div>
  );
}

function Schedule({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: string;
    appointmentDate: string | null;
    appointmentTime: string | null;
    status: string;
    confirmationNumber: string | null;
    office: { nameEn: string; province: string } | null;
    assignedStaff: { name: string | null; email: string } | null;
    application: { id: string; referenceNumber: string; applicant: { fullLegalName: string } | null; packages: Array<{ status: string }> };
  }>;
}) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Office</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Booking</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2">{row.appointmentDate} {row.appointmentTime}</td>
                <td className="px-3 py-2">
                  <Link className="font-semibold text-siam-blue" href={`/admin/licence-verification/${row.application.id}/package`}>
                    {row.application.applicant?.fullLegalName ?? row.application.referenceNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.office ? `${row.office.nameEn}, ${row.office.province}` : "—"}</td>
                <td className="px-3 py-2">{row.assignedStaff?.name || row.assignedStaff?.email || "Unassigned"}</td>
                <td className="px-3 py-2">{row.application.packages[0]?.status ?? "Not generated"}</td>
                <td className="px-3 py-2">{row.status}{row.confirmationNumber ? ` · ${row.confirmationNumber}` : ""}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-3 py-4 text-gray-500" colSpan={6}>No appointments in this list.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
