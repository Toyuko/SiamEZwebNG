import { Link } from "@/i18n/navigation";
import { AlertCircle, Bell, CheckCircle2, CreditCard, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerNextStep } from "@/lib/portal/next-steps";

function actionIcon(step: CustomerNextStep) {
  if (step.id.startsWith("invoice-") || step.id.startsWith("quoted-")) return CreditCard;
  if (step.id.startsWith("docs-")) return FileUp;
  if (step.tone === "urgent") return AlertCircle;
  return Bell;
}

export function ActionRequiredList({
  title,
  emptyTitle,
  emptyDescription,
  countLabel,
  steps,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  countLabel: (count: number) => string;
  steps: CustomerNextStep[];
}) {
  if (steps.length === 0) {
    return (
      <section className="mb-6 rounded-2xl border border-[#DCE6F5] bg-white px-4 py-4 shadow-soft dark:border-gray-700 dark:bg-gray-900 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-siam-ink dark:text-white">
              {emptyTitle}
            </h2>
            <p className="mt-0.5 text-sm text-siam-ink-muted dark:text-gray-400">
              {emptyDescription}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-siam-ink dark:text-white">{title}</h2>
        <span className="text-sm text-siam-ink-muted dark:text-gray-400">
          {countLabel(steps.length)}
        </span>
      </div>
      <ul className="space-y-2.5">
        {steps.map((step) => {
          const Icon = actionIcon(step);
          return (
            <li key={step.id}>
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-soft dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between",
                  step.tone === "urgent"
                    ? "border-amber-200 dark:border-amber-900/40"
                    : "border-[#DCE6F5] dark:border-gray-700"
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      step.tone === "urgent"
                        ? "bg-siam-yellow/25 text-siam-navy"
                        : "bg-siam-blue/10 text-siam-blue"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-siam-ink dark:text-white">{step.title}</p>
                    <p className="mt-0.5 text-sm text-siam-ink-muted dark:text-gray-400">
                      {step.description}
                    </p>
                    {step.reference ? (
                      <p className="mt-1 font-mono text-xs text-siam-ink-muted dark:text-gray-500">
                        {step.reference}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={step.href}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-siam-yellow px-4 py-2.5 text-sm font-semibold text-siam-navy transition-colors hover:bg-siam-yellow-light sm:self-center"
                >
                  {step.ctaLabel ?? "Open →"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
