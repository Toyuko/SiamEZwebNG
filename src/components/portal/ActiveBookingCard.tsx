import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CASE_STATUS_BADGE_CLASS, CASE_STATUS_LABELS } from "@/lib/domain/case-status";
import type { CaseStatus } from "@prisma/client";
import {
  buildBookingProgress,
  getCasePrimaryAction,
  type BookingPrimaryAction,
} from "@/lib/portal/booking-progress";
import { BookingStatusProgress } from "./BookingStatusProgress";

type ProgressLabels = Record<
  "booked" | "documents" | "review" | "appointment" | "completed",
  string
>;

function actionLabel(
  action: BookingPrimaryAction,
  labels: {
    view: string;
    upload: string;
    pay: string;
  }
) {
  if (action === "upload") return labels.upload;
  if (action === "pay") return labels.pay;
  return labels.view;
}

export function ActiveBookingCard({
  id,
  serviceName,
  caseNumber,
  status,
  locale,
  progressLabels,
  actionLabels,
}: {
  id: string;
  serviceName: string;
  caseNumber: string;
  status: CaseStatus;
  locale: string;
  progressLabels: ProgressLabels;
  actionLabels: { view: string; upload: string; pay: string };
}) {
  const stages = buildBookingProgress(status);
  const action = getCasePrimaryAction(status);
  const statusLabel = CASE_STATUS_LABELS[status][locale === "th" ? "th" : "en"];
  const needsAttention = action === "upload" || action === "pay";

  return (
    <article className="rounded-2xl border border-[#DCE6F5] bg-white p-4 shadow-soft dark:border-gray-700 dark:bg-gray-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-siam-ink dark:text-white">
            {serviceName}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-siam-ink-muted dark:text-gray-500">
            {caseNumber}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            CASE_STATUS_BADGE_CLASS[status]
          )}
        >
          {statusLabel}
        </span>
      </div>

      <BookingStatusProgress stages={stages} labels={progressLabels} />

      <div className="mt-4 flex justify-end">
        <Link
          href={`/portal/cases/${id}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
            needsAttention
              ? "bg-siam-yellow text-siam-navy hover:bg-siam-yellow-light"
              : "text-siam-blue hover:bg-siam-blue/5"
          )}
        >
          {actionLabel(action, actionLabels)}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function ActiveBookingsSection({
  title,
  subtitle,
  viewAllLabel,
  showViewAll,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllLabel: string;
  showViewAll: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-siam-ink dark:text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-siam-ink-muted dark:text-gray-400">{subtitle}</p>
          ) : null}
        </div>
        {showViewAll ? (
          <Link
            href="/portal/cases"
            className="text-sm font-semibold text-siam-blue hover:underline"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ActiveBookingsEmpty({
  title,
  description,
  bookLabel,
}: {
  title: string;
  description: string;
  bookLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DCE6F5] bg-white/70 px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
      <p className="font-semibold text-siam-ink dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-siam-ink-muted dark:text-gray-400">{description}</p>
      <Link
        href="/services"
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-siam-yellow px-4 py-2.5 text-sm font-semibold text-siam-navy hover:bg-siam-yellow-light"
      >
        {bookLabel}
      </Link>
    </div>
  );
}

const jobStatusBadge: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  completed_awaiting_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export function ActiveJobCard({
  id,
  title,
  serviceName,
  statusLabel,
  status,
  actionLabel,
}: {
  id: string;
  title: string;
  serviceName: string;
  statusLabel: string;
  status: string;
  actionLabel: string;
}) {
  const needsAttention = status === "completed_awaiting_review";
  return (
    <article className="rounded-2xl border border-[#DCE6F5] bg-white p-4 shadow-soft dark:border-gray-700 dark:bg-gray-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-siam-ink dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-siam-ink-muted dark:text-gray-500">
            {serviceName}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            jobStatusBadge[status] ??
              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href={`/portal/client/jobs/${id}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
            needsAttention
              ? "bg-siam-yellow text-siam-navy hover:bg-siam-yellow-light"
              : "text-siam-blue hover:bg-siam-blue/5"
          )}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
