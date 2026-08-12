import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  quoted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  custom_quote_required: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  awaiting_payment: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  awaiting_initial_payment: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  initial_payment_paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  milestone_due: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  pending_docs: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  refund_pending: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  refunded: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

export function formatCaseStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function CaseStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style =
    STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize",
        style,
        className
      )}
    >
      {formatCaseStatusLabel(status)}
    </span>
  );
}
