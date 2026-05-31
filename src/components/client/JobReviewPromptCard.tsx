"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type JobReviewPromptCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
  onOpenReview: () => void;
};

export function JobReviewPromptCard({
  title,
  description,
  buttonLabel,
  onOpenReview,
}: JobReviewPromptCardProps) {
  return (
    <div className="mt-6 rounded-xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-700/50 dark:from-amber-950/40 dark:to-orange-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300">
          <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-amber-950 dark:text-amber-100">{title}</h3>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/90">{description}</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={onOpenReview}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
