import { MessageCircle, Search } from "lucide-react";
import { site } from "@/config/site";

interface ServiceEmptyStateProps {
  title: string;
  description: string;
  lineCta: string;
  query?: string;
}

export function ServiceEmptyState({
  title,
  description,
  lineCta,
  query,
}: ServiceEmptyStateProps) {
  const message = query ? title.replace("{query}", query) : title;

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/40">
      <Search className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
      <p className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-200">{message}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
      <a
        href={site.lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#05b34c]"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {lineCta} {site.line}
      </a>
    </div>
  );
}
