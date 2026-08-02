"use client";

import { dispatchOpenConcierge } from "@/lib/ai/concierge-events";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type Props = {
  label: string;
  hint: string;
  prompt?: string;
};

export function HomeConciergeCta({ label, hint, prompt }: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-siam-blue/15 bg-gradient-to-br from-siam-blue/5 to-siam-yellow/5 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:from-siam-blue/10 dark:to-siam-yellow/5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-siam-blue text-white">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{hint}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="shrink-0 text-siam-blue-dark"
        onClick={() => dispatchOpenConcierge(prompt)}
      >
        {label}
      </Button>
    </div>
  );
}
