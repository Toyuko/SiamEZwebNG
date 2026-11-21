import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function DashboardMetric({
  label,
  value,
  icon: Icon,
  href,
  hint,
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  hint?: string;
  trend?: { label: string; positive?: boolean };
}) {
  const content = (
    <div
      className={cn(
        "rounded-2xl border border-[#DCE6F5] bg-white p-5 shadow-soft transition-colors duration-premium",
        href && "hover:border-siam-blue/40 hover:shadow-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-siam-surface text-siam-blue">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        {trend ? (
          <span
            className={cn(
              "text-xs font-semibold",
              trend.positive === false ? "text-red-600" : "text-green-600"
            )}
          >
            {trend.label}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-siam-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-siam-ink-muted">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-siam-ink-muted/80">{hint}</p> : null}
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
