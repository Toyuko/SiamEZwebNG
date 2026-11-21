"use client";

import { Link } from "@/i18n/navigation";
import { Calendar } from "lucide-react";

type MobileBookBarProps = {
  label: string;
};

/** Compact sticky booking CTA for small screens — does not cover footer permanently. */
export function MobileBookBar({ label }: MobileBookBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-siam-surface-pale bg-white/95 p-3 shadow-[0_-8px_24px_rgb(6_26_92/0.12)] backdrop-blur md:hidden">
      <Link
        href="/services"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-siam-md bg-siam-yellow text-sm font-bold text-siam-navy transition-colors hover:bg-siam-yellow-light"
      >
        <Calendar className="h-4 w-4" aria-hidden />
        {label}
      </Link>
    </div>
  );
}
