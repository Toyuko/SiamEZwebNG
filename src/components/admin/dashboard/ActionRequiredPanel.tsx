import { Bell, CheckCircle2, ChevronRight, FileWarning, IdCard, CalendarClock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { DashboardActionItem } from "@/lib/admin/dashboard-overview";

const TONE_ICON = {
  danger: FileWarning,
  warning: Bell,
  info: CalendarClock,
} as const;

const TONE_STYLES = {
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-siam-surface text-siam-blue",
} as const;

export function ActionRequiredPanel({ items }: { items: DashboardActionItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-2xl border border-[#DCE6F5] bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-[#DCE6F5] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-siam-yellow/90 text-siam-navy">
            <Bell className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-siam-ink">Action Required</h2>
            <p className="text-xs text-siam-ink-muted">Prioritized tasks for your team</p>
          </div>
        </div>
        {total > 0 ? (
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-siam-blue px-2 py-0.5 text-xs font-bold text-white">
            {total}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-siam-ink">Everything is up to date</p>
          <p className="mt-1 text-sm text-siam-ink-muted">
            No urgent tasks are waiting for your team.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#DCE6F5]">
          {items.map((item) => {
            const Icon = item.id.startsWith("dl-") ? IdCard : TONE_ICON[item.tone];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-premium hover:bg-siam-surface/60"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      TONE_STYLES[item.tone]
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-siam-ink">{item.title}</p>
                      <span className="shrink-0 rounded-md bg-siam-surface px-1.5 py-0.5 text-[11px] font-bold text-siam-blue">
                        {item.count}
                      </span>
                    </div>
                    <p className="truncate text-xs text-siam-ink-muted">{item.description}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-siam-blue">
                    {item.actionLabel}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
