import { Link } from "@/i18n/navigation";
import { IdCard } from "lucide-react";
import type { DashboardDlSummary } from "@/lib/admin/dashboard-overview";
import { cn } from "@/lib/utils";

export function FollowUpSummary({ stats }: { stats: DashboardDlSummary }) {
  const cells = [
    { label: "Due soon", value: stats.dueSoon, href: "/admin/driver-license-followups?range=30d&status=due_soon" },
    { label: "Reminders due", value: stats.remindersDue, href: "/admin/driver-license-followups?status=REMINDER_DUE" },
    {
      label: "Overdue",
      value: stats.overdue,
      href: "/admin/driver-license-followups?status=due_soon",
      danger: true,
    },
  ];

  return (
    <section className="rounded-2xl border border-[#DCE6F5] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-siam-surface text-siam-blue">
          <IdCard className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold text-siam-ink">Driver&apos;s License Follow-ups</h2>
          <p className="text-xs text-siam-ink-muted">{stats.remindersSent} reminders sent</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {cells.map((cell) => (
          <Link
            key={cell.label}
            href={cell.href}
            className="rounded-xl border border-[#DCE6F5] bg-siam-admin-bg/70 px-2 py-3 text-center transition-colors duration-premium hover:border-siam-blue/40"
          >
            <p
              className={cn(
                "text-xl font-bold",
                cell.danger && cell.value > 0 ? "text-red-600" : "text-siam-ink"
              )}
            >
              {cell.value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-siam-ink-muted">{cell.label}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/admin/driver-license-followups"
        className="mt-4 inline-flex text-sm font-semibold text-siam-blue hover:underline"
      >
        Open Follow-ups →
      </Link>
    </section>
  );
}
