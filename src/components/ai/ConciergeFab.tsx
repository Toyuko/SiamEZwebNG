"use client";

import { cn } from "@/lib/utils";
import { MessageSquareText, X } from "lucide-react";

type Props = {
  open: boolean;
  onToggle: () => void;
  label: string;
  closeLabel: string;
  /**
   * Match WhatsApp float placement (`bottom-6 right-6`).
   * Use `stacked` to sit above the WhatsApp FAB on public pages.
   */
  placement?: "default" | "stacked";
};

export const CONCIERGE_PANEL_ID = "siamez-concierge-panel";

export function ConciergeFab({
  open,
  onToggle,
  label,
  closeLabel,
  placement = "stacked",
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? closeLabel : label}
      aria-expanded={open}
      aria-controls={CONCIERGE_PANEL_ID}
      aria-haspopup="dialog"
      className={cn(
        "fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-siam-blue text-white shadow-lg transition-all hover:scale-110 hover:bg-siam-blue-light hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-yellow focus-visible:ring-offset-2",
        placement === "stacked" ? "bottom-24 right-6" : "bottom-6 right-6"
      )}
    >
      {open ? (
        <X className="h-6 w-6" aria-hidden />
      ) : (
        <MessageSquareText className="h-6 w-6" aria-hidden />
      )}
    </button>
  );
}
