import { CASE_STATUS_LABELS } from "@/lib/domain/case-status";
import { WORK_STATUS_TONE_CLASS, workStatusTone } from "@/lib/admin/work-center";
import type { CaseStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function WorkStatusBadge({
  status,
  className,
}: {
  status: CaseStatus | string;
  className?: string;
}) {
  const typed = status as CaseStatus;
  const tone = workStatusTone(typed);
  const label = CASE_STATUS_LABELS[typed]?.en ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold",
        WORK_STATUS_TONE_CLASS[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
