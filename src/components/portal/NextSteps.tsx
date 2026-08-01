import { Link } from "@/i18n/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerNextStep, NextStepTone } from "@/lib/portal/next-steps";

const toneStyles: Record<
  NextStepTone,
  { icon: typeof AlertCircle; dot: string; border: string }
> = {
  urgent: {
    icon: AlertCircle,
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-900/50",
  },
  action: {
    icon: CheckCircle2,
    dot: "bg-siam-blue",
    border: "border-siam-blue/20",
  },
  info: {
    icon: Info,
    dot: "bg-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  },
};

export function NextSteps({
  title,
  emptyLabel,
  steps,
}: {
  title: string;
  emptyLabel: string;
  steps: CustomerNextStep[];
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      {steps.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {steps.map((step) => {
            const style = toneStyles[step.tone];
            const Icon = style.icon;
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800/80",
                    style.border
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4 text-siam-blue" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
