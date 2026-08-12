import type { Metadata } from "next";
import { site } from "@/config/site";
import { canonicalUrl, languageAlternates, ogLocale } from "@/lib/seo/urls";

export type BuildPageMetadataInput = {
  locale: string;
  /** Path without locale prefix, e.g. `/services/driver-license` or `""` for home. */
  path: string;
  /** Title without the `| SiamEZ` suffix (root layout template adds it). */
  title: string;
  description: string;
  keywords?: string | string[];
  ogImage?: string;
  noindex?: boolean;
  ogType?: "website" | "article";
};

const DEFAULT_OG_IMAGE = "/opengraph-image";

export const noindexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

export const indexRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  keywords,
  ogImage,
  noindex = false,
  ogType = "website",
}: BuildPageMetadataInput): Metadata {
  const url = canonicalUrl(locale, path);
  const image = ogImage || DEFAULT_OG_IMAGE;
  const absoluteImage = image.startsWith("http") ? image : image;

  return {
    title,
    description,
    keywords,
    robots: noindex ? noindexRobots : indexRobots,
    alternates: {
      canonical: url,
      languages: noindex ? undefined : languageAlternates(path),
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url,
      siteName: site.name,
      locale: ogLocale(locale),
      type: ogType,
      images: [{ url: absoluteImage, alt: `${title} | ${site.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.name}`,
      description,
      images: [absoluteImage],
    },
  };
}
