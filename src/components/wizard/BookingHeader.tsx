"use client";

import Image from "next/image";
import { HelpCircle, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";

interface BookingHeaderProps {
  serviceSlug: string;
  serviceName: string;
  /** Warn before leaving when the form has unsaved answers */
  dirty?: boolean;
}

export function BookingHeader({ serviceSlug, serviceName, dirty }: BookingHeaderProps) {
  const exitHref = `/services/${serviceSlug}`;

  const handleExit = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!dirty) return;
    const ok = window.confirm(
      "Leave this booking? Your progress is saved on this device, so you can come back later."
    );
    if (!ok) e.preventDefault();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#DCE6F5] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/images/brand/logo-circle.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-siam-navy sm:text-base">
              {site.name}
            </p>
            <p className="truncate text-[11px] text-[#64748B] sm:text-xs">
              Booking · {serviceName}
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <a
            href={`mailto:${site.email}`}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium text-[#64748B] transition-colors hover:bg-siam-surface hover:text-siam-blue sm:px-3 sm:text-sm"
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Help</span>
          </a>
          <Link
            href={exitHref}
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold text-siam-ink transition-colors hover:bg-siam-surface sm:px-3 sm:text-sm"
          >
            <X className="h-4 w-4" aria-hidden />
            <span>Exit</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
