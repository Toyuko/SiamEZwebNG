"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface SalesVehicleImageGalleryProps {
  images: string[];
  title: string;
}

export function SalesVehicleImageGallery({ images, title }: SalesVehicleImageGalleryProps) {
  const tLightbox = useTranslations("gallery.lightbox");
  const galleryImages = useMemo(() => images.filter((imageUrl) => imageUrl.length > 0), [images]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((index) => (index <= 0 ? galleryImages.length - 1 : index - 1));
  }, [galleryImages.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((index) => (index >= galleryImages.length - 1 ? 0 : index + 1));
  }, [galleryImages.length]);

  useEffect(() => {
    if (!lightboxOpen || galleryImages.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [closeLightbox, goNext, goPrev, lightboxOpen, galleryImages.length]);

  if (galleryImages.length === 0) {
    return null;
  }

  const currentImage = galleryImages[lightboxIndex];

  return (
    <>
      <button
        type="button"
        className="group relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-xl border border-gray-200 text-left focus:outline-none focus:ring-2 focus:ring-siam-blue dark:border-gray-700"
        onClick={() => openLightbox(0)}
        aria-label={`${title} image 1`}
      >
        <Image src={galleryImages[0]} alt={title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" />
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
          <Search className="h-4 w-4" />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {galleryImages.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-siam-blue dark:border-gray-700"
            onClick={() => openLightbox(index)}
            aria-label={`${title} image ${index + 1}`}
          >
            <Image src={url} alt={`${title} gallery ${index + 1}`} fill className="object-cover" sizes="33vw" />
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
              <Search className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>

      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Vehicle image lightbox"
          onClick={closeLightbox}
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
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white md:left-4"
            aria-label={tLightbox("previous")}
          >
            <ChevronLeft className="h-10 w-10" />
          </button>

          <div className="relative h-[85vh] w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <Image src={currentImage} alt={title} fill className="object-contain" sizes="(max-width: 896px) 100vw, 896px" />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white md:right-4"
            aria-label={tLightbox("next")}
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </div>
      )}
    </>
  );
}
