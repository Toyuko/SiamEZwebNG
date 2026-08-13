"use client";

import { Link } from "@/i18n/navigation";
import type { ConciergeDeepLink } from "@/lib/ai/types";
import { dispatchOpenTawk, isTawkOpenHref } from "@/lib/tawk";
import { ExternalLink, MessageCircle } from "lucide-react";

type Props = {
  links: ConciergeDeepLink[];
  openLabel: string;
  onLiveChat?: () => void;
};

export function ConciergeDeepLinkChips({ links, openLabel, onLiveChat }: Props) {
  if (links.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5">
      {links.map((link) => {
        const isLiveChat = link.kind === "live_chat" || isTawkOpenHref(link.href);
        const isExternal = /^https?:\/\//i.test(link.href);
        const className =
          "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-siam-blue/20 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-siam-blue hover:bg-siam-blue/5 dark:border-white/15 dark:bg-gray-900/70 dark:text-sky-300";
        return (
          <li key={`${link.kind}:${link.href}`}>
            <div className="space-y-0.5">
              {isLiveChat ? (
                <button
                  type="button"
                  onClick={() => (onLiveChat ? onLiveChat() : dispatchOpenTawk())}
                  className={className}
                >
                  <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{link.label}</span>
                </button>
              ) : isExternal ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">
                    {openLabel}: {link.label}
                  </span>
                </a>
              ) : (
                <Link href={link.href} className={className}>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">
                    {openLabel}: {link.label}
                  </span>
                </Link>
              )}
              {link.reason ? (
                <p className="px-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  {link.reason}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
