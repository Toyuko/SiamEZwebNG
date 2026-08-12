"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractBookingRequirements } from "@/actions/quote";

export interface QuoteConciergeAssistProps {
  serviceSlug: string;
  currentRequirements: Record<string, unknown>;
  onApply: (requirements: Record<string, unknown>) => void;
}

/**
 * Lightweight conversational assist inside the booking wizard.
 * Reuses Concierge LLM config; never displays AI-invented prices.
 */
export function QuoteConciergeAssist({
  serviceSlug,
  currentRequirements,
  onApply,
}: QuoteConciergeAssistProps) {
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
      setMessage("");
    });
  };

  return (
    <div className="mb-6 rounded-lg border border-siam-blue/25 bg-siam-blue/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-siam-gold">
        SiamEZ AI Concierge
      </p>
      <p className="mt-1 text-sm text-foreground">
        Describe what you need in your own words — I&apos;ll fill in the relevant fields.
        Pricing is always calculated by SiamEZ rules, never invented.
      </p>
      <Textarea
        className="mt-3"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. I have a Canadian driver's license and want to convert it for a car…"
        disabled={pending}
      />
      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" onClick={submit} disabled={pending || !message.trim()}>
          {pending ? "Understanding…" : "Apply to form"}
        </Button>
      </div>
      {hint ? <p className="mt-2 text-sm text-foreground">{hint}</p> : null}
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
