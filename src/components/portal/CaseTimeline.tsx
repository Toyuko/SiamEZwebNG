import { FileText, MessageSquare, Receipt, CircleDot, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseTimelineItem, CaseTimelineKind } from "@/lib/portal/case-timeline";

const kindIcon: Record<CaseTimelineKind, typeof CircleDot> = {
  created: Flag,
  status: CircleDot,
  note: MessageSquare,
  document: FileText,
  invoice: Receipt,
  quote: Receipt,
};

export function CaseTimeline({
  title,
  emptyLabel,
  items,
  locale,
}: {
  title: string;
  emptyLabel: string;
  items: CaseTimelineItem[];
  locale: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ol className="relative mt-6 space-y-0 border-l border-gray-200 pl-6 dark:border-gray-700">
          {items.map((item, index) => {
            const Icon = kindIcon[item.kind];
            return (
              <li key={item.id} className="relative pb-8 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
                    index === 0 && "border-siam-blue/40"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      index === 0 ? "text-siam-blue" : "text-gray-500"
                    )}
                    aria-hidden
                  />
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  )}
                  <time
                    className="mt-1 block text-xs text-gray-500"
                    dateTime={item.at.toISOString()}
                  >
                    {item.at.toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
