import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConciergeServiceRecommendation } from "@/lib/ai/types";

export function AiRecommendations({
  title,
  subtitle,
  askConciergeLabel,
  bookLabel,
  recommendations,
}: {
  title: string;
  subtitle: string;
  askConciergeLabel: string;
  bookLabel: string;
  recommendations: ConciergeServiceRecommendation[];
}) {
  if (recommendations.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-siam-blue" aria-hidden />
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{askConciergeLabel}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recommendations.map((service) => (
          <li
            key={service.slug}
            className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
            <p className="mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {service.shortDescription}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href={`/booking/${service.slug}`}>{bookLabel}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
