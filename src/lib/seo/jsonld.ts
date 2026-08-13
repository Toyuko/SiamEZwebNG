import { site } from "@/config/site";
import { officeGoogleMapsUrl } from "@/lib/maps";
import { getSiteOrigin } from "@/lib/seo/urls";

export type JsonLd = Record<string, unknown>;

const origin = () => getSiteOrigin();

export function organizationId(): string {
  return `${origin()}/#organization`;
}

export function websiteId(): string {
  return `${origin()}/#website`;
}

export function localBusinessId(): string {
  return `${origin()}/#localbusiness`;
}

function postalAddress(): JsonLd {
  return {
    "@type": "PostalAddress",
    streetAddress: site.address.line1,
    addressLocality: "Bang Na",
    addressRegion: "Bangkok",
    postalCode: "10260",
    addressCountry: "TH",
  };
}

function contactPoints(): JsonLd[] {
  return [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: site.phone,
      email: site.email,
      areaServed: "TH",
      availableLanguage: ["English", "Thai"],
    },
  ];
}

/** Organization — used sitewide. No ratings, reviews, or invented claims. */
export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(),
    name: site.name,
    legalName: site.legal.companyName,
    url: origin(),
    email: site.email,
    telephone: site.phone,
    description: site.tagline,
    address: postalAddress(),
    sameAs: [
      site.social.facebook,
      site.social.instagram,
      site.social.linkedin,
      site.social.youtube,
      site.social.tiktok,
      site.lineUrl,
    ].filter(Boolean),
    contactPoint: contactPoints(),
  };
}

/**
 * LocalBusiness for the Bangkok office. areaServed is Thailand (nationwide
 * assistance) — we do not claim additional branch offices.
 */
export function localBusinessJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": localBusinessId(),
    name: site.legal.companyName,
    alternateName: site.name,
    url: origin(),
    email: site.email,
    telephone: site.phone,
    image: `${origin()}/images/logo.png`,
    description: site.description,
    address: postalAddress(),
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.address.coords.lat,
      longitude: site.address.coords.lng,
    },
    hasMap: officeGoogleMapsUrl(),
    areaServed: {
      "@type": "Country",
      name: "Thailand",
    },
    parentOrganization: { "@id": organizationId() },
    contactPoint: contactPoints(),
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId(),
    name: site.name,
    url: origin(),
    inLanguage: ["en", "th"],
    publisher: { "@id": organizationId() },
  };
}

export function webPageJsonLd(input: {
  url: string;
  name: string;
  description: string;
  locale: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.locale === "th" ? "th-TH" : "en-US",
    isPartOf: { "@id": websiteId() },
    about: { "@id": organizationId() },
  };
}

export function breadcrumbListJsonLd(
  items: Array<{ name: string; url: string }>
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  url: string;
  areaServed?: string;
  priceAmount?: number | null;
  priceCurrency?: string | null;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { "@id": organizationId() },
    areaServed: {
      "@type": "Country",
      name: input.areaServed ?? "Thailand",
    },
    ...(input.priceAmount != null
      ? {
          offers: {
            "@type": "Offer",
            price: (input.priceAmount / 100).toFixed(2),
            priceCurrency: input.priceCurrency ?? "THB",
            url: input.url,
          },
        }
      : {}),
  };
}

export function faqPageJsonLd(faqs: Array<{ question: string; answer: string }>): JsonLd | null {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
