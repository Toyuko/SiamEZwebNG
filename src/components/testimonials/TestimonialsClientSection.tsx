"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PlatformBadge } from "@/components/testimonials/PlatformBadge";
import type {
  DisplayTestimonial,
  TestimonialPlatformFilter,
} from "@/lib/testimonial-display";
import { youtubeEmbedUrl, youtubeThumbnailUrl, youtubeVideoIdFromUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export type TestimonialsSectionLabels = {
  filterAriaLabel: string;
  filters: {
    all: string;
    google: string;
    facebook: string;
    youtube: string;
  };
  platformNames: {
    google: string;
    facebook: string;
    youtube: string;
  };
  watchVideoReview: string;
  watchOnYoutube: string;
  emptyCategory: string;
};

const FILTER_KEYS: TestimonialPlatformFilter[] = [
  "all",
  "google",
  "facebook",
  "youtube",
];

export function TestimonialsClientSection({
  testimonials,
  labels,
}: {
  testimonials: DisplayTestimonial[];
  labels: TestimonialsSectionLabels;
}) {
  const [active, setActive] = useState<TestimonialPlatformFilter>("all");
  const [youtubeModal, setYoutubeModal] = useState<{
    videoId: string;
    title: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (active === "all") return testimonials;
    return testimonials.filter((t) => t.platform === active);
  }, [active, testimonials]);

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-4 sm:gap-6">
        <div
          className="flex w-full max-w-2xl flex-wrap justify-center gap-2"
          role="tablist"
          aria-label={labels.filterAriaLabel}
        >
          {FILTER_KEYS.map((key) => {
            const label =
              key === "all"
                ? labels.filters.all
                : key === "google"
                  ? labels.filters.google
                  : key === "facebook"
                    ? labels.filters.facebook
                    : labels.filters.youtube;
            const selected = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(key)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-siam-blue bg-siam-blue text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-siam-blue/40 hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((testimonial) => {
          const ytId =
            testimonial.platform === "youtube" && testimonial.videoLink
              ? youtubeVideoIdFromUrl(testimonial.videoLink)
              : null;

          return (
            <Card
              key={testimonial.id}
              className="border-border shadow-sm"
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-siam-blue">
                    {testimonial.service}
                  </div>
                  <PlatformBadge
                    platform={testimonial.platform}
                    label={labels.platformNames[testimonial.platform]}
                  />
                </div>
                <div className="flex gap-1 text-siam-yellow">
                  {"★".repeat(testimonial.stars)}
                  {testimonial.stars < 5 && "☆".repeat(5 - testimonial.stars)}
                </div>

                {ytId ? (
                  <button
                    type="button"
                    className="group relative mt-4 w-full overflow-hidden rounded-lg border border-border bg-muted/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2"
                    onClick={() => setYoutubeModal({ videoId: ytId, title: testimonial.author })}
                    aria-label={labels.watchVideoReview}
                  >
                    <div className="relative aspect-video w-full max-h-36 sm:max-h-40">
                      <Image
                        src={youtubeThumbnailUrl(ytId, "mq")}
                        alt=""
                        fill
                        className="object-cover transition duration-200 group-hover:brightness-90"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <span
                        className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35"
                        aria-hidden
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/75 text-white shadow-lg ring-2 ring-white/30 transition group-hover:bg-red-600 group-hover:ring-white/50 sm:h-14 sm:w-14">
                          <Play className="h-5 w-5 fill-current pl-0.5 sm:h-6 sm:w-6" aria-hidden />
                        </span>
                      </span>
                    </div>
                  </button>
                ) : null}

                <blockquote className="mt-4 flex-1 text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {testimonial.platform === "youtube" && testimonial.videoLink ? (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={testimonial.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                        {labels.watchOnYoutube}
                      </a>
                    </Button>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-siam-blue text-sm font-semibold text-white">
                    {testimonial.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">{labels.emptyCategory}</p>
      ) : null}

      <Modal
        open={!!youtubeModal}
        onClose={() => setYoutubeModal(null)}
        title={youtubeModal?.title ?? labels.watchVideoReview}
        className="max-w-3xl border-border bg-card p-4 sm:p-5"
      >
        {youtubeModal ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black shadow-inner">
            <iframe
              className="h-full w-full"
              src={youtubeEmbedUrl(youtubeModal.videoId, true)}
              title={labels.watchVideoReview}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
