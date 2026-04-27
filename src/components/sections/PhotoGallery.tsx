"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GALLERY_ITEMS,
  GALLERY_CATEGORIES,
  type GalleryCategory,
  type GalleryItem,
} from "@/config/gallery";

export function PhotoGallery() {
  const t = useTranslations("gallery");
  const tCategories = useTranslations("gallery.categories");
  const tLightbox = useTranslations("gallery.lightbox");
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const filteredItems =
    activeCategory === "all"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i <= 0 ? filteredItems.length - 1 : i - 1));
  }, [filteredItems.length]);
  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i >= filteredItems.length - 1 ? 0 : i + 1));
  }, [filteredItems.length]);

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

  const currentItem = filteredItems[lightboxIndex] as GalleryItem | undefined;

  return (
    <section className="border-t border-border bg-card/30 py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Category filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {GALLERY_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeCategory === key
                  ? "bg-siam-blue text-white shadow-md"
                  : "bg-background text-foreground border border-border hover:border-siam-blue hover:text-siam-blue"
              )}
            >
              {tCategories(key)}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition hover:border-siam-blue hover:shadow-md focus:outline-none focus:ring-2 focus:ring-siam-blue focus:ring-offset-2"
              onClick={() => openLightbox(index)}
            >
              <Image
                src={item.src}
                alt={item.alt ?? `Gallery image ${item.id}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <p className="py-12 text-center text-muted">
            No photos in this category yet.
          </p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery lightbox"
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
              src={currentItem.src}
              alt={currentItem.alt ?? `Gallery image ${currentItem.id}`}
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
    </section>
  );
}
