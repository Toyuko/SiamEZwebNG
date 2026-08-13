import { PRIVATE_MEDIA_CATEGORIES, SOCIAL_PHOTO_ORDER } from "@/config/vehicle-intake";
import { site } from "@/config/site";
import { formatThb } from "@/lib/vehicle-leads/display";

export type MarketingLanguage = "en" | "th" | "both";

export type SocialPlatformContent = {
  headline?: string;
  post?: string;
  caption?: string;
  reelCaption?: string;
  script?: string;
  hashtags: string[];
  cta: string;
  title?: string;
  description?: string;
  message?: string;
};

export type VehicleMarketingPackage = {
  officialTitle: string;
  headlines: string[];
  sellingPoints: string[];
  description: string;
  priceLabel: string;
  priceIsOfficial: boolean;
  facebook: SocialPlatformContent;
  instagram: SocialPlatformContent;
  tiktok: SocialPlatformContent;
  line: SocialPlatformContent;
  whatsapp: SocialPlatformContent;
  marketplace: SocialPlatformContent;
  hashtags: string[];
  imageRecommendations: { mediaId: string; category: string; reason: string }[];
  language: MarketingLanguage;
};

export type PublicVehicleFacts = {
  kind: string;
  make: string | null;
  model: string | null;
  year: number | null;
  variant: string | null;
  engineSize: string | null;
  transmission: string | null;
  fuel: string | null;
  mileageKm: number | null;
  colour: string | null;
  province: string | null;
  city: string | null;
  overallCondition: string | null;
  accidentHistory: string | null;
  floodDamage: string | null;
  modifications: string | null;
  serviceHistory: string | null;
  officialListingPrice: number | null;
  askingPrice: number | null;
};

export type PublicMedia = {
  id: string;
  category: string;
  isPrivate: boolean;
  mediaType: string;
};

const PII_KEYS = [
  "customerName",
  "customerPhone",
  "customerLineId",
  "customerEmail",
  "registeredOwner",
  "restrictions",
] as const;

export function toPublicVehicleFacts(input: PublicVehicleFacts): PublicVehicleFacts {
  return { ...input };
}

export function assertNoCustomerPii(text: string): boolean {
  const lower = text.toLowerCase();
  return !PII_KEYS.some((key) => lower.includes(key.toLowerCase()));
}

export function recommendSocialImages(media: PublicMedia[]): VehicleMarketingPackage["imageRecommendations"] {
  const publicPhotos = media.filter(
    (m) => m.mediaType === "image" && !m.isPrivate && !PRIVATE_MEDIA_CATEGORIES.has(m.category)
  );
  const ranked = [...publicPhotos].sort((a, b) => {
    const ai = SOCIAL_PHOTO_ORDER.indexOf(a.category as (typeof SOCIAL_PHOTO_ORDER)[number]);
    const bi = SOCIAL_PHOTO_ORDER.indexOf(b.category as (typeof SOCIAL_PHOTO_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return ranked.slice(0, 6).map((m, i) => ({
    mediaId: m.id,
    category: m.category,
    reason:
      i === 0
        ? "Best overall / opening image"
        : m.category === "interior"
          ? "Interior detail"
          : m.category === "dashboard"
            ? "Dashboard / odometer"
            : "Supporting vehicle photo",
  }));
}

function sellingPointsFromFacts(facts: PublicVehicleFacts): string[] {
  const points: string[] = [];
  if (facts.mileageKm != null && facts.mileageKm < 20000) points.push("Low mileage");
  if (facts.overallCondition === "excellent") points.push("Excellent condition");
  if (facts.overallCondition === "good") points.push("Good condition");
  if (facts.serviceHistory && /full|regular|complete/i.test(facts.serviceHistory)) {
    points.push("Service history noted");
  }
  if (facts.accidentHistory === "no") points.push("No accident history reported");
  if (facts.floodDamage === "no") points.push("No flood damage reported");
  if (facts.year && facts.year >= new Date().getFullYear() - 3) points.push("Recent model year");
  if (facts.province) points.push(`Located in ${facts.province}`);
  return points;
}

function hashtagsFor(facts: PublicVehicleFacts, language: MarketingLanguage): string[] {
  const tags = ["#SiamEZ"];
  if (language !== "en") tags.push("#รถมือสอง", "#SiamEZรถ");
  if (facts.kind === "motorcycle") {
    tags.push("#MotorcycleThailand");
    if (language !== "en") tags.push("#มอเตอร์ไซค์");
  } else {
    tags.push("#CarThailand");
    if (language !== "en") tags.push("#รถยนต์");
  }
  if (facts.make) tags.push(`#${facts.make.replace(/\s+/g, "")}`);
  if (facts.make && facts.model) {
    tags.push(`#${`${facts.make}${facts.model}`.replace(/\s+/g, "")}`);
  }
  if (facts.province) tags.push(`#${facts.province.replace(/\s+/g, "")}`);
  return [...new Set(tags)].slice(0, 10);
}

function vehicleLine(facts: PublicVehicleFacts): string {
  return [facts.make, facts.model, facts.year].filter(Boolean).join(" ") || "Vehicle";
}

function specLines(facts: PublicVehicleFacts): string[] {
  const lines: string[] = [];
  if (facts.mileageKm != null) lines.push(`Mileage: ${facts.mileageKm.toLocaleString("en-US")} km`);
  if (facts.engineSize) lines.push(`Engine: ${facts.engineSize}`);
  if (facts.transmission) lines.push(`Transmission: ${facts.transmission}`);
  if (facts.fuel) lines.push(`Fuel: ${facts.fuel}`);
  if (facts.colour) lines.push(`Colour: ${facts.colour}`);
  if (facts.overallCondition) lines.push(`Condition: ${facts.overallCondition}`);
  if (facts.province) lines.push(`Location: ${facts.province}${facts.city ? `, ${facts.city}` : ""}`);
  return lines;
}

export function buildRuleBasedMarketingPackage(input: {
  facts: PublicVehicleFacts;
  language: MarketingLanguage;
  media: PublicMedia[];
}): VehicleMarketingPackage {
  const facts = input.facts;
  const title = vehicleLine(facts);
  const points = sellingPointsFromFacts(facts);
  const tags = hashtagsFor(facts, input.language);
  const official = facts.officialListingPrice != null;
  const price = official ? facts.officialListingPrice : facts.askingPrice;
  const priceLabel = official
    ? formatThb(price)
    : price != null
      ? `${formatThb(price)} (customer asking — not an approved listing price)`
      : "Price on request";
  const specs = specLines(facts);
  const cta = `Contact SiamEZ ${site.line} · ${site.phone}`;
  const location = facts.province || "Thailand";

  const headlines = [
    `${title}${facts.mileageKm != null ? ` | ${facts.mileageKm.toLocaleString("en-US")} km` : ""} | ${location}`,
    `${title} | ${points[0] ?? "SiamEZ vehicle service"} | ${location}`,
    `SiamEZ: ${title}${price != null && official ? ` | ${formatThb(price)}` : ""}`,
    `${title} available with SiamEZ support`,
    `${facts.kind === "motorcycle" ? "Motorcycle" : "Car"} for sale — ${title}`,
  ].slice(0, 5);

  const bodyFacts = [...specs, ...points.map((p) => `• ${p}`)].join("\n");
  const facebookPost = [
    headlines[0],
    "",
    bodyFacts,
    "",
    `Price: ${priceLabel}`,
    `SiamEZ can help with viewing, negotiation, and paperwork.`,
    "",
    cta,
    tags.join(" "),
  ].join("\n");

  const instagramCaption = [
    `${title} ✨`,
    priceLabel,
    points.slice(0, 3).join(" · "),
    location,
    cta,
    tags.join(" "),
  ].join("\n");

  const thTitle = title;
  const lineMessage =
    input.language === "en"
      ? `Hi, SiamEZ has a ${title} in ${location}. ${priceLabel}. ${points[0] ?? "Details available."} Message us if you'd like to know more.`
      : `สวัสดีค่ะ SiamEZ มี ${thTitle} ที่${location} ${priceLabel} สนใจสอบถามรายละเอียดเพิ่มเติมได้เลยค่ะ`;

  return {
    officialTitle: title,
    headlines,
    sellingPoints: points,
    description: specs.join(". ") || title,
    priceLabel,
    priceIsOfficial: official,
    facebook: {
      headline: headlines[0],
      post: facebookPost,
      hashtags: tags,
      cta,
    },
    instagram: {
      caption: instagramCaption,
      reelCaption: `${title} — ${priceLabel} — ${location}`,
      hashtags: tags,
      cta,
    },
    tiktok: {
      script: [
        `Hook: Looking for a ${facts.kind} in ${location}?`,
        `Intro: This is a ${title}.`,
        points[0] ? `Feature: ${points[0]}.` : "Feature: Details verified with SiamEZ.",
        `Price: ${priceLabel}.`,
        `CTA: Message SiamEZ to view or get help buying.`,
      ].join("\n"),
      caption: `${title} | ${location}`,
      hashtags: tags,
      cta,
    },
    line: { message: lineMessage, hashtags: [], cta },
    whatsapp: {
      message: `${title}\n${specs.join("\n")}\n${priceLabel}\n${cta}`,
      hashtags: [],
      cta,
    },
    marketplace: {
      title,
      description: [specs.join("\n"), points.length ? `Highlights:\n${points.map((p) => `- ${p}`).join("\n")}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      headline: title,
      hashtags: [],
      cta,
    },
    hashtags: tags,
    imageRecommendations: recommendSocialImages(input.media),
    language: input.language,
  };
}

export function buildSoldPost(input: { title: string; language: MarketingLanguage }): string {
  if (input.language === "th") {
    return `SiamEZ ปิดการขายอีกคันแล้ว! ขอบคุณที่ไว้วางใจให้เราช่วยเรื่องรถในไทย\n#SiamEZ #รถมือสอง`;
  }
  return `Another successful vehicle sale completed by SiamEZ! Thank you for trusting us with your Thailand vehicle journey.\n#SiamEZ`;
}
