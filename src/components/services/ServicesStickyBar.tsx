"use client";

import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

interface ServicesStickyBarProps {
  bookNowLabel: string;
  lineLabel: string;
  bookHref: string;
}

/** Mobile-first sticky CTA — hidden on md+ where cards expose full actions. */
export function ServicesStickyBar({ bookNowLabel, lineLabel, bookHref }: ServicesStickyBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95 md:hidden">
      <div className="flex gap-2">
        <Link
          href={bookHref}
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-siam-blue text-sm font-semibold text-white hover:bg-siam-blue-light"
          onClick={() => trackEvent("service_book_click", { source: "sticky_bar" })}
        >
          {bookNowLabel}
        </Link>
        <a
          href={site.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#06C755] bg-[#06C755]/10 text-sm font-semibold text-[#06C755]"
          onClick={() => trackEvent("service_line_click", { source: "sticky_bar" })}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {lineLabel}
        </a>
      </div>
    </div>
  );
}
