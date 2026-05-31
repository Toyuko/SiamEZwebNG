"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JobReviewModalProps = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  freelancerName: string;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  ratingLabel: string;
  submittingLabel: string;
  onSuccess: () => void;
  onError: (message: string) => void;
};

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-9 w-9 transition-colors", className)}
      aria-hidden
    >
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        d="M12 2.5l2.9 6.5 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7-5.4-4.7 7.1-.6L12 2.5z"
      />
    </svg>
  );
}

export function JobReviewModal({
  open,
  onClose,
  jobId,
  freelancerName,
  title,
  submitLabel,
  cancelLabel,
  commentLabel,
  commentPlaceholder,
  ratingLabel,
  submittingLabel,
  onSuccess,
  onError,
}: JobReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const displayRating = hoverRating || rating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      onError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        onError(json.error ?? "Could not submit your review.");
        return;
      }

      setRating(0);
      setHoverRating(0);
      setComment("");
      onSuccess();
      onClose();
    } catch {
      onError("Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-review-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-label={cancelLabel}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={cancelLabel}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="job-review-title" className="pr-8 text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{freelancerName}</p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {ratingLabel}
            </p>
            <div
              className="flex gap-1"
              onMouseLeave={() => setHoverRating(0)}
              role="radiogroup"
              aria-label={ratingLabel}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = value <= displayRating;
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-md p-0.5 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue",
                      filled ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
                    )}
                    onMouseEnter={() => setHoverRating(value)}
                    onClick={() => setRating(value)}
                    role="radio"
                    aria-checked={rating === value}
                  >
                    <StarIcon filled={filled} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="job-review-comment"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {commentLabel}
            </label>
            <textarea
              id="job-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={commentPlaceholder}
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-siam-blue focus:outline-none focus:ring-2 focus:ring-siam-blue/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || rating < 1}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {submittingLabel}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
