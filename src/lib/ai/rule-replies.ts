import {
  getPopularRecommendations,
  getServiceBySlug,
  searchCatalogServices,
} from "@/lib/ai/recommend";
import { recommendTool } from "@/lib/ai/tools/recommend";
import type {
  ConciergeDeepLink,
  ConciergeLocale,
  ConciergeReply,
  ConciergeServiceRecommendation,
} from "@/lib/ai/types";

const GREETING_RE =
  /^(hi|hello|hey|good\s*(morning|afternoon|evening)|sawadee|สวัสดี|หวัดดี)\b/i;

const POPULAR_RE =
  /\b(popular|most\s*requested|top\s*services|แนะนำ|ยอดนิยม|บริการยอดนิยม)\b/i;

const HELP_RE =
  /\b(help|what\s+can\s+you\s+do|how\s+does\s+this\s+work|ช่วย|ทำอะไรได้)\b/i;

const BOOK_RE =
  /\b(book|start\s*booking|i\s*want\s*to\s*book|จอง|เริ่มจอง)\b/i;

const MARKETPLACE_RE =
  /motorcycle|motorbike|scooter|\bbike\b|car|vehicle|listing|sales|condo|property|house|villa|real\s*estate|มอเตอร์ไซค์|สกู๊ตเตอร์|รถยนต์|คอนโด|บ้าน|อสังหา|รายการ/i;

const COPY = {
  en: {
    greeting:
      "Hi — I'm the SiamEZ Concierge. Tell me what you need in Thailand (visa, driver's license, translation, vehicles, and more) and I'll recommend the right service or listing.",
    help: "I can search services and marketplace listings, suggest packages (e.g. motorcycle → registration), and deep-link you into booking or `/sales/{id}`. Try: “I viewed a motorcycle” or “find Honda Wave”.",
    popularIntro: "Here are popular services expats book most often:",
    bookIntro: "Great — pick a service to start booking, or describe what you need:",
    found: (n: number) =>
      n === 1
        ? "I found a matching service. Tap Book to open the wizard:"
        : `I found ${n} matching services. Tap Book to open the wizard:`,
    crossSell:
      "Based on what you described, here are related packages and next steps:",
    marketplace:
      "I can search vehicles and properties across SiamEZ. Related services and any matching listings are below — tap a link to open `/sales/{id}` or book a package.",
    none: "I couldn't find an exact match. Browse popular services below, or try different keywords (e.g. visa, license, motorcycle, condo).",
    fallback:
      "I can help you find the right SiamEZ service or listing. Describe your need, or choose a popular option below.",
  },
  th: {
    greeting:
      "สวัสดีครับ/ค่ะ — ฉันคือ Concierge ของ SiamEZ บอกความต้องการในไทยได้เลย (วีซ่า ใบขับขี่ แปลเอกสาร รถ ฯลฯ) แล้วฉันจะแนะนำบริการหรือรายการที่เหมาะสม",
    help: "ฉันค้นหาบริการและรายการในตลาด แนะนำแพ็กเกจ (เช่น มอเตอร์ไซค์ → จดทะเบียน) และพาไปหน้าจองหรือ `/sales/{id}` ได้ ลองพิมพ์ เช่น “ดูมอเตอร์ไซค์” หรือ “หา Honda Wave”",
    popularIntro: "บริการยอดนิยมที่ลูกค้าต่างชาติจองบ่อย:",
    bookIntro: "เลือกบริการเพื่อเริ่มจอง หรืออธิบายสิ่งที่ต้องการ:",
    found: (n: number) =>
      n === 1
        ? "พบบริการที่ตรงกัน กดจองเพื่อเปิดวิซาร์ด:"
        : `พบ ${n} บริการที่เกี่ยวข้อง กดจองเพื่อเปิดวิซาร์ด:`,
    crossSell: "จากที่คุณบอก นี่คือแพ็กเกจและขั้นตอนที่เกี่ยวข้อง:",
    marketplace:
      "ฉันค้นหารถและอสังหาใน SiamEZ ได้ บริการที่เกี่ยวข้องและรายการที่ตรงกันอยู่ด้านล่าง — กดลิงก์เพื่อเปิด `/sales/{id}` หรือจองแพ็กเกจ",
    none: "ไม่พบบริการที่ตรงเป๊ะ ลองดูบริการยอดนิยมด้านล่าง หรือใช้คำอื่น เช่น วีซ่า ใบขับขี่ มอเตอร์ไซค์ คอนโด",
    fallback:
      "ฉันช่วยหาบริการหรือรายการ SiamEZ ที่เหมาะกับคุณได้ อธิบายความต้องการ หรือเลือกจากตัวเลือกยอดนิยมด้านล่าง",
  },
} as const;

function dedupeRecommendations(
  items: ConciergeServiceRecommendation[]
): ConciergeServiceRecommendation[] {
  const seen = new Set<string>();
  const out: ConciergeServiceRecommendation[] = [];
  for (const item of items) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

function suggestionsToServiceRecs(
  locale: ConciergeLocale,
  slugs: string[]
): ConciergeServiceRecommendation[] {
  const out: ConciergeServiceRecommendation[] = [];
  for (const slug of slugs) {
    const svc = getServiceBySlug(slug, locale);
    if (svc) out.push(svc);
  }
  return out;
}

function suggestionsToDeepLinks(
  suggestions: ReturnType<typeof recommendTool>["suggestions"]
): ConciergeDeepLink[] {
  const links: ConciergeDeepLink[] = [];
  for (const s of suggestions) {
    if (s.kind === "service") continue; // shown as book chips
    links.push({
      href: s.href,
      label: s.title,
      kind: s.kind === "listing" ? "listing" : "life_event",
    });
  }
  return links;
}

export type RuleReplyExtras = {
  /** Precomputed listing deep links from unified search (server). */
  searchDeepLinks?: ConciergeDeepLink[];
};

/**
 * Rule / catalog-based replies used when no LLM API key is configured.
 * Pure and unit-testable. Uses M5 recommendations engine for cross-sell.
 */
export function buildRuleBasedReply(
  userMessage: string,
  locale: ConciergeLocale,
  extras?: RuleReplyExtras
): ConciergeReply {
  const copy = COPY[locale] ?? COPY.en;
  const text = userMessage.trim();
  const searchDeepLinks = extras?.searchDeepLinks ?? [];

  if (!text || GREETING_RE.test(text)) {
    const recommendations = getPopularRecommendations(locale, 4);
    return {
      content: copy.greeting,
      recommendations,
      deepLinks: searchDeepLinks,
      mode: "rule",
    };
  }

  if (HELP_RE.test(text)) {
    return {
      content: copy.help,
      recommendations: getPopularRecommendations(locale, 3),
      deepLinks: searchDeepLinks,
      mode: "rule",
    };
  }

  if (POPULAR_RE.test(text)) {
    return {
      content: copy.popularIntro,
      recommendations: getPopularRecommendations(locale, 4),
      deepLinks: searchDeepLinks,
      mode: "rule",
    };
  }

  if (BOOK_RE.test(text) && text.length < 40) {
    return {
      content: copy.bookIntro,
      recommendations: getPopularRecommendations(locale, 4),
      deepLinks: searchDeepLinks,
      mode: "rule",
    };
  }

  // Cross-sell / marketplace orchestration via recommendations engine
  const rec = recommendTool({ locale, query: text, limit: 6 });
  const engineServices = suggestionsToServiceRecs(locale, rec.serviceSlugs);
  const engineLinks = [
    ...suggestionsToDeepLinks(rec.suggestions),
    ...searchDeepLinks,
  ];

  if (engineServices.length > 0 && (MARKETPLACE_RE.test(text) || engineLinks.length > 0)) {
    return {
      content: searchDeepLinks.length > 0 ? copy.marketplace : copy.crossSell,
      recommendations: dedupeRecommendations(engineServices),
      deepLinks: engineLinks,
      mode: "rule",
    };
  }

  const matches = searchCatalogServices(text, locale, 5);
  if (matches.length === 0 && engineServices.length === 0) {
    return {
      content: copy.none,
      recommendations: getPopularRecommendations(locale, 4),
      deepLinks: searchDeepLinks,
      mode: "rule",
    };
  }

  const merged = dedupeRecommendations(
    engineServices.length > 0
      ? [...engineServices, ...matches].slice(0, 5)
      : matches
  );

  return {
    content: copy.found(merged.length),
    recommendations: merged,
    deepLinks: engineLinks.length > 0 ? engineLinks : searchDeepLinks,
    mode: "rule",
  };
}
