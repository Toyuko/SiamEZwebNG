import { cn } from "@/lib/utils";
import type { ServiceBadgeKey } from "@/config/service-catalog";

const badgeStyles: Record<ServiceBadgeKey, string> = {
  popular: "bg-siam-yellow/20 text-amber-800 dark:text-amber-300",
  sameDay: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  fixedPrice: "bg-blue-100 text-siam-blue dark:bg-blue-900/30 dark:text-blue-300",
  homeService: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  bangkok: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  nationwide: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

interface ServiceBadgesProps {
  badges: ServiceBadgeKey[];
  labels: Record<ServiceBadgeKey, string>;
  className?: string;
  max?: number;
}

export function ServiceBadges({ badges, labels, className, max = 3 }: ServiceBadgesProps) {
  if (!badges.length) return null;
  const visible = badges.slice(0, max);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((badge) => (
        <span
          key={badge}
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badgeStyles[badge]
          )}
        >
          {labels[badge]}
        </span>
      ))}
    </div>
  );
}
