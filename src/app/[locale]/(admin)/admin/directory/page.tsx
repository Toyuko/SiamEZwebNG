import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { StatusBadge } from "@/components/directory/StatusBadge";
import { loadStarterRecords } from "@/actions/directory";
import { resolveDirectoryAccess, searchDirectoryOfficesForAdmin } from "@/data-access/directory";
import { fill, getDirectoryCopy } from "@/lib/directory/copy";
import { isVerificationStale } from "@/lib/directory/constants";
import { parseDirectoryQuery } from "@/lib/directory/search";
import { provinceLabel } from "@/lib/directory/provinces";

export default async function AdminDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);
  const access = await resolveDirectoryAccess();
  if (!access.canManage && !isAdminAuthBypassEnabled()) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">{copy.accessDeniedTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.accessDeniedBody}</p>
        <Link href="/directory" className="mt-4 inline-block font-semibold text-siam-blue">
          {copy.brand}
        </Link>
      </main>
    );
  }
  const params = await searchParams;
  const query = parseDirectoryQuery({
    ...params,
    archived: params.archived,
    stale: params.stale,
  });
  const result = await searchDirectoryOfficesForAdmin(query);

  return (
    <main className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.adminTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {copy.openQueue}: {result.openReports} · {copy.pendingQueue}: {result.pendingSubmissions}
      </p>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
        <input name="q" defaultValue={query.q} placeholder={copy.searchPlaceholder} className="h-11 min-w-56 rounded-lg border px-3" />
        <select name="status" defaultValue={query.status} className="h-11 rounded-lg border px-2">
          <option value="">{copy.all}</option>
          {Object.entries(copy.statuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="stale" value="1" defaultChecked={query.stale} />
          {copy.stale}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={query.includeArchived} />
          {copy.includeArchived}
        </label>
        <button className="h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white">{copy.search}</button>
      </form>
      <form action={loadStarterRecords} className="mb-4">
        <button className="text-sm font-semibold text-siam-blue">{copy.loadStarter}</button>
        <p className="text-xs text-muted-foreground">{copy.loadStarterHelp}</p>
      </form>
      <p className="mb-3 text-sm">{fill(copy.results, { count: result.total })}</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">{copy.nameEn}</th>
              <th className="p-3">{copy.province}</th>
              <th className="p-3">{copy.status}</th>
              <th className="p-3">{copy.call}</th>
              <th className="p-3"> </th>
            </tr>
          </thead>
          <tbody>
            {result.offices.map((office) => {
              const stale = isVerificationStale({
                verificationStatus: office.verificationStatus,
                lastVerifiedAt: office.lastVerifiedAt,
                archivedAt: office.archivedAt,
                reminderDays: result.reminderDays,
              });
              return (
                <tr key={office.id} className="border-t border-border">
                  <td className="p-3">
                    <Link href={`/admin/directory/${office.id}/edit`} className="font-medium text-siam-blue">
                      {office.nameEn || office.nameTh}
                    </Link>
                    <p className="text-xs text-muted-foreground">{office.nameTh}</p>
                    {stale ? <p className="text-xs text-amber-800">{copy.stale}</p> : null}
                  </td>
                  <td className="p-3">{provinceLabel(office.provinceCode, locale)}</td>
                  <td className="p-3">
                    <StatusBadge status={office.verificationStatus} copy={copy} />
                  </td>
                  <td className="p-3">{office.phonePrimary || "—"}</td>
                  <td className="p-3">
                    <Link href={`/directory/${office.slug}`} className="text-siam-blue">
                      {copy.view}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
