export {
  getSiteOrigin,
  normalizePath,
  localizedPath,
  canonicalUrl,
  languageAlternates,
  ogLocale,
  isAppLocale,
} from "@/lib/seo/urls";
export { buildPageMetadata, indexRobots, noindexRobots } from "@/lib/seo/metadata";
export {
  organizationJsonLd,
  localBusinessJsonLd,
  websiteJsonLd,
  webPageJsonLd,
  breadcrumbListJsonLd,
  serviceJsonLd,
  faqPageJsonLd,
  organizationId,
  websiteId,
  localBusinessId,
} from "@/lib/seo/jsonld";
export {
  getServiceSeo,
  relatedServiceSlugs,
  serviceSeoBySlug,
} from "@/lib/seo/service-seo";
