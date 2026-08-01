import {
  getPopularRecommendations,
  searchCatalogServices,
} from "@/lib/ai/recommend";
import type {
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

const COPY = {
  en: {
    greeting:
      "Hi — I'm the SiamEZ Concierge. Tell me what you need in Thailand (visa, driver's license, translation, and more) and I'll recommend the right service.",
    help: "I can search our service catalog, suggest popular options, and deep-link you into the booking wizard. Try: “I need a Thai driver's license” or tap a quick action below.",
    popularIntro: "Here are popular services expats book most often:",
    bookIntro: "Great — pick a service to start booking, or describe what you need:",
    found: (n: number) =>
      n === 1
        ? "I found a matching service. Tap Book to open the wizard:"
        : `I found ${n} matching services. Tap Book to open the wizard:`,
    none: "I couldn't find an exact match. Browse popular services below, or try different keywords (e.g. visa, license, translation).",
    fallback:
      "I can help you find the right SiamEZ service. Describe your need, or choose a popular option below.",
  },
  th: {
    greeting:
      "สวัสดีครับ/ค่ะ — ฉันคือ Concierge ของ SiamEZ บอกความต้องการในไทยได้เลย (วีซ่า ใบขับขี่ แปลเอกสาร ฯลฯ) แล้วฉันจะแนะนำบริการที่เหมาะสม",
    help: "ฉันค้นหาบริการ แนะนำตัวเลือกยอดนิยม และพาไปหน้าจองได้ ลองพิมพ์ เช่น “ต้องการทำใบขับขี่ไทย” หรือกดปุ่มด้านล่าง",
    popularIntro: "บริการยอดนิยมที่ลูกค้าต่างชาติจองบ่อย:",
    bookIntro: "เลือกบริการเพื่อเริ่มจอง หรืออธิบายสิ่งที่ต้องการ:",
    found: (n: number) =>
      n === 1
        ? "พบบริการที่ตรงกัน กดจองเพื่อเปิดวิซาร์ด:"
        : `พบ ${n} บริการที่เกี่ยวข้อง กดจองเพื่อเปิดวิซาร์ด:`,
    none: "ไม่พบบริการที่ตรงเป๊ะ ลองดูบริการยอดนิยมด้านล่าง หรือใช้คำอื่น เช่น วีซ่า ใบขับขี่ แปลเอกสาร",
    fallback:
      "ฉันช่วยหาบริการ SiamEZ ที่เหมาะกับคุณได้ อธิบายความต้องการ หรือเลือกจากตัวเลือกยอดนิยมด้านล่าง",
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

/**
 * Rule / catalog-based replies used when no LLM API key is configured.
 * Pure and unit-testable.
 */
export function buildRuleBasedReply(
  userMessage: string,
  locale: ConciergeLocale
): ConciergeReply {
  const copy = COPY[locale] ?? COPY.en;
  const text = userMessage.trim();

  if (!text || GREETING_RE.test(text)) {
    const recommendations = getPopularRecommendations(locale, 4);
    return {
      content: copy.greeting,
      recommendations,
      mode: "rule",
    };
  }

  if (HELP_RE.test(text)) {
    return {
      content: copy.help,
      recommendations: getPopularRecommendations(locale, 3),
      mode: "rule",
    };
  }

  if (POPULAR_RE.test(text)) {
    return {
      content: copy.popularIntro,
      recommendations: getPopularRecommendations(locale, 4),
      mode: "rule",
    };
  }

  if (BOOK_RE.test(text) && text.length < 40) {
    return {
      content: copy.bookIntro,
      recommendations: getPopularRecommendations(locale, 4),
      mode: "rule",
    };
  }

  const matches = searchCatalogServices(text, locale, 5);
  if (matches.length === 0) {
    return {
      content: copy.none,
      recommendations: getPopularRecommendations(locale, 4),
      mode: "rule",
    };
  }

  return {
    content: copy.found(matches.length),
    recommendations: dedupeRecommendations(matches),
    mode: "rule",
  };
}
