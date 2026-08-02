import { Link } from "@/i18n/navigation";
import type { RecommendationSuggestion } from "@/lib/recommendations";
import { ArrowRight, Sparkles } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  suggestions: RecommendationSuggestion[];
  /** Compact strip for listing detail sidebars. */
  compact?: boolean;
};

/**
 * Lean suggestion surface for portal home / listing detail.
 * Additive only — does not redesign surrounding layouts.
 */
export function SuggestionSlot({
  title,
  subtitle,
  ctaLabel,
  suggestions,
  compact = false,
}: Props) {
  if (suggestions.length === 0) return null;

  return (
    <section
      className={
        compact
          ? "mt-4 rounded-lg border border-siam-blue/20 bg-siam-blue/[0.04] p-3 dark:bg-siam-blue/10"
          : "mt-10"
      }
      aria-label={title}
    >
      <div className={compact ? "mb-2" : "mb-4"}>
        <h2
          className={
            compact
              ? "flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white"
              : "flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
          }
        >
          <Sparkles
            className={compact ? "h-4 w-4 text-siam-blue" : "h-5 w-5 text-siam-blue"}
            aria-hidden
          />
          {title}
        </h2>
        {subtitle ? (
          <p
            className={
              compact
                ? "mt-0.5 text-xs text-gray-600 dark:text-gray-400"
                : "mt-1 text-sm text-gray-600 dark:text-gray-400"
            }
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <ul
        className={
          compact
            ? "space-y-2"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {suggestions.map((item) => (
          <li
            key={`${item.kind}:${item.id}`}
            className={
              compact
                ? "flex items-start justify-between gap-2"
                : "flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            }
          >
            <div className="min-w-0 flex-1">
              <p
                className={
                  compact
                    ? "text-sm font-medium text-gray-900 dark:text-white"
                    : "font-medium text-gray-900 dark:text-white"
                }
              >
                {item.title}
              </p>
              <p
                className={
                  compact
                    ? "mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400"
                    : "mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-3"
                }
              >
                {item.reason}
              </p>
            </div>
            <Link
              href={item.href}
              className={
                compact
                  ? "mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-siam-blue hover:underline"
                  : "mt-3 inline-flex items-center gap-1 text-sm font-semibold text-siam-blue hover:underline"
              }
            >
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
