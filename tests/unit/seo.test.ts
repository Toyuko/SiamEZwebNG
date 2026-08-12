import { describe, expect, it } from "vitest";
import { serviceSlugs } from "@/config/services";
import { canonicalUrl, languageAlternates, normalizePath } from "@/lib/seo/urls";
import { getServiceSeo, serviceSeoBySlug } from "@/lib/seo/service-seo";
import { faqPageJsonLd, localBusinessJsonLd, organizationJsonLd } from "@/lib/seo/jsonld";

describe("SEO URL helpers", () => {
  it("builds locale canonical URLs without trailing slashes", () => {
    expect(normalizePath("/services/")).toBe("/services");
    expect(canonicalUrl("en", "/services/driver-license")).toMatch(
      /\/en\/services\/driver-license$/
    );
    expect(canonicalUrl("th", "")).toMatch(/\/th$/);
  });

  it("includes hreflang for en, th, and x-default", () => {
    const languages = languageAlternates("/services");
    expect(languages.en).toMatch(/\/en\/services$/);
    expect(languages.th).toMatch(/\/th\/services$/);
    expect(languages["x-default"]).toMatch(/\/en\/services$/);
  });
});

describe("service SEO catalog", () => {
  it("covers every public service slug with unique English titles", () => {
    const titles = serviceSlugs.map((slug) => serviceSeoBySlug[slug].title.en);
    expect(titles).toHaveLength(serviceSlugs.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("covers every public service slug with unique English descriptions", () => {
    const descriptions = serviceSlugs.map((slug) => serviceSeoBySlug[slug].description.en);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("returns localized FAQs and related services", () => {
    const seo = getServiceSeo("driver-license", "en");
    expect(seo?.relatedSlugs).toContain("vehicle-registration");
    expect(seo?.faqs.length).toBeGreaterThan(0);
    expect(seo?.title).toContain("Driver's License");
  });
});

describe("structured data", () => {
  it("does not invent ratings or reviews on Organization/LocalBusiness", () => {
    const org = JSON.stringify(organizationJsonLd());
    const local = JSON.stringify(localBusinessJsonLd());
    expect(org).not.toContain("aggregateRating");
    expect(org).not.toContain("review");
    expect(local).not.toContain("aggregateRating");
  });

  it("builds FAQPage JSON-LD only when FAQs exist", () => {
    expect(faqPageJsonLd([])).toBeNull();
    const json = faqPageJsonLd([{ question: "Q?", answer: "A." }]);
    expect(json?.["@type"]).toBe("FAQPage");
  });
});
