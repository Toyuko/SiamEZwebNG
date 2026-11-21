"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractBookingRequirements } from "@/actions/quote";
import { cn } from "@/lib/utils";

export interface QuoteConciergeAssistProps {
  serviceSlug: string;
  currentRequirements: Record<string, unknown>;
  onApply: (requirements: Record<string, unknown>) => void;
}

/**
 * Lightweight conversational assist inside the booking wizard.
 * Collapsed by default so the main questions stay above the fold.
 * Reuses Concierge LLM config; never displays AI-invented prices.
 */
export function QuoteConciergeAssist({
  serviceSlug,
  currentRequirements,
  onApply,
}: QuoteConciergeAssistProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!message.trim()) return;
    setError(null);
    setHint(null);
    startTransition(async () => {
      const result = await extractBookingRequirements({
        serviceSlug,
        message: message.trim(),
        currentRequirements,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onApply(result.data.requirements);
      if (result.data.missingQuestions.length > 0) {
        setHint(
          `Got it. Please still confirm: ${result.data.missingQuestions.join(", ")}.`
        );
      } else {
        setHint("Requirements updated from your description. Review the fields below, then continue.");
      }
    });
    setMessage("");
  };

  return (
    <div className="rounded-2xl border border-[#DCE6F5] bg-siam-surface/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-siam-ink">
          <Sparkles className="h-4 w-4 text-siam-blue" aria-hidden />
          Prefer to describe it in your own words?
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-siam-blue transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-[#DCE6F5] px-4 py-3">
          <p className="text-xs text-[#64748B]">
            Optional — we&apos;ll fill matching fields. Pricing always uses SiamEZ rules.
          </p>
          <Textarea
            className="mt-3"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I have a Canadian driver's license and want to convert it for a car…"
            disabled={pending}
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={submit}
              disabled={pending || !message.trim()}
            >
              {pending ? "Understanding…" : "Apply to form"}
            </Button>
          </div>
          {hint ? <p className="mt-2 text-sm text-siam-ink">{hint}</p> : null}
          {error ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
