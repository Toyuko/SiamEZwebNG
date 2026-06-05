import { site } from "@/config/site";
import type { EnrichedService } from "@/lib/service-display";

interface ServicesJsonLdProps {
  services: EnrichedService[];
  locale: string;
  pageName: string;
  pageDescription: string;
}

/** Schema.org Service + ItemList for the services directory page. */
export function ServicesJsonLd({
  services,
  locale,
  pageName,
  pageDescription,
}: ServicesJsonLdProps) {
  const baseUrl = site.url.replace(/\/$/, "");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pageName,
    description: pageDescription,
    numberOfItems: services.length,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/${locale}/services/${service.slug}`,
      name: service.name,
    })),
  };

  const serviceEntities = services.map((service) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.shortDescription ?? service.description ?? "",
    url: `${baseUrl}/${locale}/services/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: site.name,
      url: baseUrl,
      telephone: site.phone,
      email: site.email,
    },
    areaServed: {
      "@type": "Country",
      name: "Thailand",
    },
    ...(service.priceAmount != null
      ? {
          offers: {
            "@type": "Offer",
            price: (service.priceAmount / 100).toFixed(2),
            priceCurrency: service.priceCurrency ?? "THB",
          },
        }
      : {}),
  }));

  const payload = [itemList, ...serviceEntities];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
