"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, ChevronLeft, ChevronRight, Instagram } from "lucide-react";
import { RED_DOOR_GALLERY_ITEMS } from "@/config/red-door-gallery";
import { cn } from "@/lib/utils";

export function RedDoorVenueGallery() {
  const t = useTranslations("eventPlanningVenuePage");
  const tLightbox = useTranslations("gallery.lightbox");
  const alts = t.raw("galleryImageAlts") as string[];

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i <= 0 ? RED_DOOR_GALLERY_ITEMS.length - 1 : i - 1));
  }, []);
  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i >= RED_DOOR_GALLERY_ITEMS.length - 1 ? 0 : i + 1));
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox, goPrev, goNext]);

  const current = RED_DOOR_GALLERY_ITEMS[lightboxIndex];
  const currentAlt = alts[lightboxIndex] ?? `The Red Door Bkk — ${lightboxIndex + 1}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("galleryTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {t("galleryIntro")}
        </p>
        <a
          href={t("instagramUrl")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
        >
          <Instagram className="h-4 w-4 shrink-0" aria-hidden />
          {t("galleryInstagramCta")}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {RED_DOOR_GALLERY_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "group relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm transition",
              "hover:border-siam-blue hover:shadow-md focus:outline-none focus:ring-2 focus:ring-siam-blue focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800/80",
            )}
            onClick={() => {
              setLightboxIndex(index);
              setLightboxOpen(true);
            }}
          >
            <Image
              src={item.src}
              alt={alts[index] ?? item.id}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-500">{t("galleryAttribution")}</p>

      {lightboxOpen && current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={tLightbox("close")}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white"
            aria-label={tLightbox("close")}
          >
            <X className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white md:left-4"
            aria-label={tLightbox("previous")}
          >
            <ChevronLeft className="h-10 w-10" />
          </button>
          <div className="relative h-[85vh] w-full max-w-4xl">
            <Image
              src={current.src}
              alt={currentAlt}
              fill
              className="object-contain"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white md:right-4"
            aria-label={tLightbox("next")}
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </div>
      )}
    </div>
  );
}
