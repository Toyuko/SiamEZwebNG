"use client";

import { Link } from "@/i18n/navigation";
import { bookingPathForSlug } from "@/lib/ai/tools/search-services";
import type { ConciergeServiceRecommendation } from "@/lib/ai/types";
import { ArrowRight } from "lucide-react";

type Props = {
  recommendations: ConciergeServiceRecommendation[];
  bookLabel: string;
};

export function ConciergeServiceChips({ recommendations, bookLabel }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {recommendations.map((service) => (
        <li key={service.slug}>
          <div className="rounded-xl border border-siam-blue/15 bg-white/80 p-3 dark:border-white/10 dark:bg-gray-900/60">
            <p className="text-sm font-semibold text-siam-blue-dark dark:text-white">
              {service.name}
            </p>
            {service.reason ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-siam-blue/90 dark:text-sky-300/90">
                {service.reason}
              </p>
            ) : service.shortDescription ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                {service.shortDescription}
              </p>
            ) : null}
            <Link
              href={bookingPathForSlug(service.slug)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-siam-blue hover:underline"
            >
              {bookLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
