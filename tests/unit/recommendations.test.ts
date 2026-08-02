import { describe, expect, it } from "vitest";
import { openListingTool, openServiceTool } from "@/lib/ai/tools/open-link";
import { recommendTool } from "@/lib/ai/tools/recommend";
import { buildRuleBasedReply } from "@/lib/ai/rule-replies";
import {
  applyRecommendationRules,
  buildListingRecommendationPath,
  isCuidListingHref,
  recommendSync,
} from "@/lib/recommendations";

const motorcycleCuid = "clmoto0123456789abcdefgh";
const propertyCuid = "clprop9876543210zyxwvuts";

describe("recommendation rules — motorcycle cross-sell", () => {
  it("surfaces vehicle-registration when viewing a motorcycle", () => {
    const result = recommendSync({
      locale: "en",
      listings: [
        {
          listingType: "vehicle",
          listingId: motorcycleCuid,
          category: "motorcycle",
          title: "Honda Wave 110i",
          source: "view",
        },
      ],
      limit: 8,
    });

    const slugs = result.suggestions
      .filter((s) => s.kind === "service")
      .map((s) => s.id);

    expect(slugs).toContain("vehicle-registration");
    expect(slugs).toContain("car-motorbike-finder-selling-service");
    // No invented insurance package — only real seeded slugs
    expect(slugs.every((s) => !s.includes("insurance"))).toBe(true);
  });

  it("surfaces registration from motorcycle query text", () => {
    const suggestions = applyRecommendationRules({
      locale: "th",
      query: "ฉันดูมอเตอร์ไซค์แล้ว ต้องการจดทะเบียน",
      limit: 6,
    });
    expect(suggestions.some((s) => s.id === "vehicle-registration")).toBe(true);
  });

  it("recommendTool exposes service slugs for Concierge chips", () => {
    const tool = recommendTool({
      locale: "en",
      query: "motorcycle registration package",
      limit: 5,
    });
    expect(tool.serviceSlugs).toContain("vehicle-registration");
  });
});

describe("recommendation URL contracts", () => {
  it("builds listing hrefs with cuid, never slug", () => {
    const vehicleSlug = "honda-wave-bargain";
    const href = buildListingRecommendationPath("vehicle", motorcycleCuid);
    expect(href).toBe(`/sales/${motorcycleCuid}`);
    expect(href).not.toContain(vehicleSlug);
    expect(isCuidListingHref(href)).toBe(true);

    const propertyHref = buildListingRecommendationPath("property", propertyCuid);
    expect(propertyHref).toBe(`/real-estate/${propertyCuid}`);
    expect(isCuidListingHref(propertyHref)).toBe(true);
  });

  it("openListingTool returns /sales/[id] for Concierge deep-link acceptance", () => {
    const opened = openListingTool({
      listingType: "vehicle",
      listingId: motorcycleCuid,
      label: "Honda Wave",
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.href).toBe(`/sales/${motorcycleCuid}`);
    expect(opened.kind).toBe("listing");
  });

  it("rejects empty listing ids", () => {
    expect(openListingTool({ listingType: "vehicle", listingId: "  " }).ok).toBe(
      false
    );
  });

  it("openServiceTool books real seeded slugs", () => {
    const opened = openServiceTool({ slug: "vehicle-registration" });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.href).toBe("/book/vehicle-registration");
  });
});

describe("concierge rule reply + recommendations orchestration", () => {
  it("motorcycle intent attaches registration recommendation", () => {
    const reply = buildRuleBasedReply(
      "I viewed a motorcycle and need registration",
      "en"
    );
    expect(reply.recommendations.some((r) => r.slug === "vehicle-registration")).toBe(
      true
    );
  });

  it("attaches provided search deep links for /sales/{cuid}", () => {
    const reply = buildRuleBasedReply("find motorcycle Honda", "en", {
      searchDeepLinks: [
        {
          href: `/sales/${motorcycleCuid}`,
          label: "Honda Wave",
          kind: "listing",
        },
      ],
    });
    expect(reply.deepLinks?.some((l) => l.href === `/sales/${motorcycleCuid}`)).toBe(
      true
    );
  });
});
