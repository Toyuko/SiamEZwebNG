"use client";

import { Link } from "@/i18n/navigation";
import { getPopularRecommendations } from "@/lib/ai/recommend";
import { bookingPathForSlug } from "@/lib/ai/tools/search-services";
import type { ConciergeLocale } from "@/lib/ai/types";

type Props = {
  locale: ConciergeLocale;
  labels: {
    popular: string;
    startBooking: string;
    help: string;
    book: string;
  };
  onPrompt: (prompt: string) => void;
  disabled?: boolean;
};

export function ConciergeQuickActions({
  locale,
  labels,
  onPrompt,
  disabled,
}: Props) {
  const popular = getPopularRecommendations(locale, 4);

  return (
    <div className="space-y-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onPrompt(locale === "th" ? "บริการยอดนิยม" : "Show popular services")
          }
          className="rounded-full border border-siam-blue/20 bg-siam-blue/5 px-2.5 py-1 text-[11px] font-medium text-siam-blue hover:bg-siam-blue/10 disabled:opacity-50"
        >
          {labels.popular}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onPrompt(locale === "th" ? "ฉันอยากเริ่มจอง" : "I want to start booking")
          }
          className="rounded-full border border-siam-blue/20 bg-siam-blue/5 px-2.5 py-1 text-[11px] font-medium text-siam-blue hover:bg-siam-blue/10 disabled:opacity-50"
        >
          {labels.startBooking}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onPrompt(locale === "th" ? "ช่วยเหลือ" : "What can you help with?")
          }
          className="rounded-full border border-siam-blue/20 bg-siam-blue/5 px-2.5 py-1 text-[11px] font-medium text-siam-blue hover:bg-siam-blue/10 disabled:opacity-50"
        >
          {labels.help}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {popular.map((service) => (
          <Link
            key={service.slug}
            href={bookingPathForSlug(service.slug)}
            className="rounded-full bg-siam-yellow/90 px-2.5 py-1 text-[11px] font-semibold text-siam-blue-dark hover:bg-siam-yellow"
          >
            {labels.book}: {service.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
