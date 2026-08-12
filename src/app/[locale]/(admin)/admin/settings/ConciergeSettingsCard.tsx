"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConciergeSettings } from "@/lib/concierge-settings";
import { updateAdminConciergeSettings } from "@/actions/admin";

export function ConciergeSettingsCard({ initial }: { initial: ConciergeSettings }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ConciergeSettings>(initial);

  const onChange = (key: keyof ConciergeSettings, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminConciergeSettings(form);
        setMessage("Ask SiamEZ settings saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save settings");
      }
    });
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Ask SiamEZ (AI Concierge)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => onChange("enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Concierge enabled for customers
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fallback-en">Fallback message (EN)</Label>
            <textarea
              id="fallback-en"
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.fallbackMessageEn}
              onChange={(e) => onChange("fallbackMessageEn", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallback-th">Fallback message (TH)</Label>
            <textarea
              id="fallback-th"
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.fallbackMessageTh}
              onChange={(e) => onChange("fallbackMessageTh", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-en">Contact hint (EN)</Label>
            <Input
              id="contact-en"
              value={form.contactHintEn}
              onChange={(e) => onChange("contactHintEn", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-th">Contact hint (TH)</Label>
            <Input
              id="contact-th"
              value={form.contactHintTh}
              onChange={(e) => onChange("contactHintTh", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="faq-en">FAQ (EN, one per line)</Label>
            <textarea
              id="faq-en"
              className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.faqEn}
              onChange={(e) => onChange("faqEn", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-th">FAQ (TH, one per line)</Label>
            <textarea
              id="faq-th"
              className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.faqTh}
              onChange={(e) => onChange("faqTh", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="knowledge-en">Verified knowledge (EN)</Label>
            <textarea
              id="knowledge-en"
              className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.knowledgeEn}
              onChange={(e) => onChange("knowledgeEn", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="knowledge-th">Verified knowledge (TH)</Label>
            <textarea
              id="knowledge-th"
              className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.knowledgeTh}
              onChange={(e) => onChange("knowledgeTh", e.target.value)}
            />
          </div>
        </div>

        {message ? <p className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save Concierge settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
