import { Link } from "@/i18n/navigation";
import { CaseStatusBadge } from "@/components/admin/CaseStatusBadge";
import type { DashboardRecentCase } from "@/lib/admin/dashboard-overview";

function formatUpdated(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RecentCasesTable({ cases }: { cases: DashboardRecentCase[] }) {
  return (
    <section className="rounded-2xl border border-[#DCE6F5] bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-[#DCE6F5] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-siam-ink">Recent Work</h2>
          <p className="text-xs text-siam-ink-muted">Latest customer work activity</p>
        </div>
        <Link
          href="/admin/work-center"
          prefetch
          className="text-sm font-semibold text-siam-blue hover:underline"
        >
          Open Work Center →
        </Link>
      </div>

      {cases.length === 0 ? (
        <p className="px-5 py-8 text-sm text-siam-ink-muted">No recent cases.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#DCE6F5] text-xs uppercase tracking-wide text-siam-ink-muted">
                <th className="px-5 py-3 font-semibold">Case No.</th>
                <th className="px-3 py-3 font-semibold">Service</th>
                <th className="px-3 py-3 font-semibold">Client</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F5]">
              {cases.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-siam-surface/50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/work-center/${c.id}`}
                      prefetch
                      className="font-semibold text-siam-blue hover:underline"
                    >
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-siam-ink">{c.serviceName ?? "—"}</td>
                  <td className="px-3 py-3 text-siam-ink-muted">{c.clientName}</td>
                  <td className="px-3 py-3">
                    <CaseStatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-siam-ink-muted">{formatUpdated(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
