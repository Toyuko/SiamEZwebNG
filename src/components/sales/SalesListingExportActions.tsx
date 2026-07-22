"use client";

import { useState } from "react";
import { ClipboardCopy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type ExportListing = {
  make?: string;
  model?: string;
  title?: string;
  heroImageUrl: string;
  imageUrls: unknown;
  description: string;
};

function getListingImageUrls(listing: ExportListing): string[] {
  const urls = Array.isArray(listing.imageUrls)
    ? listing.imageUrls.filter((url): url is string => typeof url === "string")
    : [];
  return Array.from(new Set([listing.heroImageUrl, ...urls].filter(Boolean)));
}

function resolveImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return url;
}

function getExtension(url: string): string {
  const match = url.match(/\.(jpe?g|png|webp|gif)(\?.*)?$/i);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function slugifyFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "listing";
}

async function downloadImage(url: string, filename: string) {
  const resolved = resolveImageUrl(url);
  try {
    const response = await fetch(resolved);
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    return;
  } catch {
    const anchor = document.createElement("a");
    anchor.href = resolved;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.download = filename;
    anchor.click();
  }
}

type SalesListingExportActionsProps = {
  listing: ExportListing;
  translationNamespace?: "salesAdmin" | "sales" | "realEstate" | "realEstateAdmin";
  variant?: "icon" | "labeled";
};

export function SalesListingExportActions({
  listing,
  translationNamespace = "salesAdmin",
  variant = "icon",
}: SalesListingExportActionsProps) {
  const t = useTranslations(translationNamespace);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [downloading, setDownloading] = useState(false);

  const imageCount = getListingImageUrls(listing).length;
  const copyLabel =
    copyState === "copied"
      ? t("copyDescriptionCopied")
      : copyState === "error"
        ? t("copyDescriptionError")
        : t("copyDescription");
  const downloadLabel = t("downloadImages", { count: imageCount });

  const handleCopyDescription = async () => {
    try {
      await navigator.clipboard.writeText(listing.description);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  const handleDownloadImages = async () => {
    const urls = getListingImageUrls(listing);
    if (urls.length === 0 || downloading) return;

    setDownloading(true);
    const base = slugifyFilename(
      listing.title?.trim() ||
        [listing.make, listing.model].filter(Boolean).join("-") ||
        "listing"
    );
    try {
      for (let index = 0; index < urls.length; index += 1) {
        await downloadImage(urls[index], `${base}-${index + 1}.${getExtension(urls[index])}`);
        if (index < urls.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 300));
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  if (variant === "labeled") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleCopyDescription}
        >
          <ClipboardCopy className={`h-4 w-4 ${copyState === "copied" ? "text-emerald-600" : ""}`} />
          {copyLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={imageCount === 0 || downloading}
          onClick={handleDownloadImages}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloadLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={copyLabel}
        aria-label={t("copyDescription")}
        onClick={handleCopyDescription}
      >
        <ClipboardCopy className={`h-4 w-4 ${copyState === "copied" ? "text-emerald-600" : ""}`} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={downloadLabel}
        aria-label={downloadLabel}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
