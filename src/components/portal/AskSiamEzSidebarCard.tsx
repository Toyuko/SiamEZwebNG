"use client";

import { Headphones } from "lucide-react";
import { dispatchOpenConcierge } from "@/lib/ai/concierge-events";

export function AskSiamEzSidebarCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => dispatchOpenConcierge()}
      className="mb-3 flex w-full items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-siam-yellow text-siam-navy">
        <Headphones className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-white/70">{subtitle}</span>
      </span>
    </button>
  );
}
