import { cn } from "@/lib/utils";
import type { DirectoryCopy } from "@/lib/directory/copy";

const tones: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  needs_verification: "bg-amber-50 text-amber-900 ring-amber-200",
  unverified: "bg-slate-100 text-slate-700 ring-slate-200",
  temporarily_closed: "bg-orange-50 text-orange-900 ring-orange-200",
  permanently_closed: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function StatusBadge({
  status,
  copy,
  className,
}: {
  status: string;
  copy: DirectoryCopy;
  className?: string;
}) {
  const label = copy.statuses[status as keyof DirectoryCopy["statuses"]] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[status] ?? tones.unverified,
        className
      )}
    >
      {label}
    </span>
  );
}
