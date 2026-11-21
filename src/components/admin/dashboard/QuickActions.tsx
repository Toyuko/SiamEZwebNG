import { CalendarPlus, FilePlus2, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    label: "Schedule Appointment",
    href: "/admin/calendar",
    icon: CalendarPlus,
    emphasis: false,
  },
  {
    label: "Add Client",
    href: "/admin/clients/new",
    icon: UserPlus,
    emphasis: false,
  },
  {
    label: "Create Invoice",
    href: "/admin/invoices/new",
    icon: FilePlus2,
    emphasis: false,
  },
] as const;

export function QuickActions() {
  return (
    <section className="rounded-2xl border border-[#DCE6F5] bg-white p-5 shadow-soft">
      <h2 className="text-base font-semibold text-siam-ink">Quick Actions</h2>
      <p className="mt-0.5 text-xs text-siam-ink-muted">Common tasks in one click</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-[#DCE6F5] px-3 py-3 text-sm font-semibold transition-colors duration-premium",
                "bg-siam-admin-bg/60 text-siam-ink hover:border-siam-blue/40 hover:bg-siam-surface"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-siam-blue shadow-soft">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
