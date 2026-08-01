"use client";

import { useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { summarizeCase, type CaseSummaryInput } from "@/lib/admin/case-summary";

export function CaseAiSummaryPanel({
  input,
  labels,
}: {
  input: CaseSummaryInput;
  labels: {
    title: string;
    stubHint: string;
    attention: string;
    regenerate: string;
    hide: string;
    show: string;
  };
}) {
  const [open, setOpen] = useState(true);
  const [seed, setSeed] = useState(0);

  const summary = useMemo(() => {
    void seed;
    return summarizeCase(input);
  }, [input, seed]);

  return (
    <Card className="border-siam-blue/20 bg-gradient-to-br from-siam-blue/5 to-transparent dark:from-siam-blue/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 text-siam-blue" aria-hidden />
          <div>
            <CardTitle className="text-base">{labels.title}</CardTitle>
            <p className="mt-1 text-xs text-gray-500">{labels.stubHint}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setSeed((s) => s + 1)}
          >
            {labels.regenerate}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">{open ? labels.hide : labels.show}</span>
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{summary.headline}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {summary.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {summary.attention.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                {labels.attention}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-900 dark:text-amber-100">
                {summary.attention.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
