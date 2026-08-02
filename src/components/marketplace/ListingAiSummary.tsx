interface ListingAiSummaryProps {
  summary: string;
  title: string;
}

/**
 * Visible AI / enhancement summary for marketplace detail pages.
 * Source content (description) stays untouched; this is additive.
 */
export function ListingAiSummary({ summary, title }: ListingAiSummaryProps) {
  const text = summary.trim();
  if (!text) return null;

  return (
    <aside
      className="rounded-lg border border-siam-blue/20 bg-siam-blue/5 p-3 text-sm leading-relaxed text-gray-800 dark:border-siam-blue/30 dark:bg-siam-blue/10 dark:text-gray-200"
      aria-label={title}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-siam-blue dark:text-siam-blue-light">
        {title}
      </p>
      <p className="break-words">{text}</p>
    </aside>
  );
}
