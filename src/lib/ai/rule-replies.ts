import {
  getPopularRecommendations,
  getServiceBySlug,
  searchCatalogServices,
} from "@/lib/ai/recommend";
import { detectConciergeIntent } from "@/lib/ai/intents";
import { recommendTool } from "@/lib/ai/tools/recommend";
import { escalateHumanTool } from "@/lib/ai/tools/escalate-human";
import {
  buildLifeEventRecommendationPath,
  type RecommendationSuggestion,
} from "@/lib/recommendations";
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
      "Hi — I'm Ask SiamEZ. Tell me what you need (services, driver's license, vehicles, real estate, and more) and I'll help you find the right next step.",
    help: "I can search services and published car/property listings, recommend what fits, and hand you Book or View buttons. I won't invent prices or listings.",
    popularIntro: "Here are popular services expats book most often:",
    bookIntro: "Great — pick a service to start booking, or describe what you need:",
    found: (n: number) =>
      n === 1
        ? "I found a matching service. Tap Book to open the wizard:"
        : `I found ${n} matching services. Tap Book to open the wizard:`,
    crossSell:
      "Based on what you described, here are related packages and next steps:",
    marketplace:
      "I can search vehicles and properties across SiamEZ. Related services and any matching listings are below — tap a link to open a listing or book a package.",
    none: "I couldn't find an exact match. Browse popular services below, or try different keywords (e.g. visa, license, motorcycle, condo).",
    fallback:
      "I can help you find the right SiamEZ service or listing. Describe your need, or choose a popular option below.",
  },
  th: {
    greeting:
      "สวัสดีครับ/ค่ะ — ฉันคือ Ask SiamEZ บอกความต้องการได้เลย (บริการ ใบขับขี่ รถ อสังหา ฯลฯ) แล้วฉันจะช่วยหาขั้นตอนถัดไปที่เหมาะสม",
    help: "ฉันค้นหาบริการและประกาศรถ/อสังหาที่เผยแพร่จริง แนะนำสิ่งที่เหมาะ และพาไปปุ่มจองหรือดูรายการ — จะไม่ประดิษฐ์ราคาหรือประกาศ",
    popularIntro: "บริการยอดนิยมที่ลูกค้าต่างชาติจองบ่อย:",
    bookIntro: "เลือกบริการเพื่อเริ่มจอง หรืออธิบายสิ่งที่ต้องการ:",
    found: (n: number) =>
      n === 1
        ? "พบบริการที่ตรงกัน กดจองเพื่อเปิดวิซาร์ด:"
        : `พบ ${n} บริการที่เกี่ยวข้อง กดจองเพื่อเปิดวิซาร์ด:`,
    crossSell: "จากที่คุณบอก นี่คือแพ็กเกจและขั้นตอนที่เกี่ยวข้อง:",
    marketplace:
      "ฉันค้นหารถและอสังหาใน SiamEZ ได้ บริการที่เกี่ยวข้องและรายการที่ตรงกันอยู่ด้านล่าง — กดลิงก์เพื่อเปิดรายการหรือจองแพ็กเกจ",
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
  suggestions: RecommendationSuggestion[]
): ConciergeServiceRecommendation[] {
  const out: ConciergeServiceRecommendation[] = [];
  for (const s of suggestions) {
    if (s.kind !== "service") continue;
    const svc = getServiceBySlug(s.id, locale);
    if (svc) out.push({ ...svc, reason: s.reason, score: s.score });
  }
  return out;
}

function suggestionsToDeepLinks(
  suggestions: RecommendationSuggestion[]
): ConciergeDeepLink[] {
  const links: ConciergeDeepLink[] = [];
  for (const s of suggestions) {
    if (s.kind === "service") continue; // shown as book chips
    links.push({
      href: s.href,
      label: s.title,
      kind: s.kind === "listing" ? "listing" : "life_event",
      reason: s.reason,
    });
  }
  return links;
}

export type RuleReplyExtras = {
  /** Precomputed listing deep links from unified search (server). */
  searchDeepLinks?: ConciergeDeepLink[];
  /** Precomputed engine suggestions (with configurable reasons). */
  engineSuggestions?: RecommendationSuggestion[];
  /** Optional journey summary (unused in pure rule path; reserved). */
  journeySummary?: string;
};

/**
 * Rule / catalog-based replies used when no LLM API key is configured.
 * Pure and unit-testable. Uses M5 recommendations engine for cross-sell.
 */
/** True when server-side orchestration should run (mutations / auth-gated links). */
export function hasOrchestrationIntent(userMessage: string): boolean {
  return detectConciergeIntent(userMessage) !== null;
}

function orchestrationHintReply(
  userMessage: string,
  locale: ConciergeLocale,
  searchDeepLinks: ConciergeDeepLink[]
): ConciergeReply | null {
  const intent = detectConciergeIntent(userMessage);
  if (!intent) return null;

  if (intent.kind === "escalate") {
    const escalation = escalateHumanTool({ context: userMessage, locale });
    return {
      content:
        locale === "th"
          ? "ฉันจะเชื่อมต่อคุณกับผู้ประสานงาน — กด WhatsApp หรือ LINE ด้านล่าง"
          : "I'll connect you with a coordinator — tap WhatsApp or LINE below.",
      recommendations: getPopularRecommendations(locale, 2),
      deepLinks: [
        {
          href: escalation.whatsappUrl,
          label: escalation.whatsappLabel,
          kind: "search",
        },
        {
          href: escalation.lineUrl,
          label: escalation.lineLabel,
          kind: "search",
        },
        ...searchDeepLinks,
      ],
      mode: "rule",
    };
  }

  if (intent.kind === "start_life_event") {
    const goalsPath = buildLifeEventRecommendationPath(intent.lifeEventKey);
    return {
      content:
        locale === "th"
          ? "กำลังเริ่มเช็กลิสต์ให้คุณ…"
          : "Starting your journey checklist…",
      recommendations: getPopularRecommendations(locale, 2),
      deepLinks: [
        { href: goalsPath, label: locale === "th" ? "เป้าหมาย" : "Goals", kind: "life_event" },
        ...searchDeepLinks,
      ],
      mode: "rule",
    };
  }

  return {
    content:
      locale === "th"
        ? "กำลังเริ่มเวิร์กโฟลว์ให้คุณ…"
        : "Starting your workflow…",
    recommendations: getPopularRecommendations(locale, 2),
    deepLinks: [
      {
        href: "/portal/workflows",
        label: locale === "th" ? "เวิร์กโฟลว์" : "Workflows",
        kind: "search",
      },
      ...searchDeepLinks,
    ],
    mode: "rule",
  };
}

export function buildRuleBasedReply(
  userMessage: string,
  locale: ConciergeLocale,
  extras?: RuleReplyExtras
): ConciergeReply {
  const copy = COPY[locale] ?? COPY.en;
  const text = userMessage.trim();
  const searchDeepLinks = extras?.searchDeepLinks ?? [];

  const orchestrationHint = orchestrationHintReply(text, locale, searchDeepLinks);
  if (orchestrationHint) {
    return orchestrationHint;
  }

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
  const engineSuggestions =
    extras?.engineSuggestions ??
    recommendTool({ locale, query: text, limit: 6 }).suggestions;
  const engineServices = suggestionsToServiceRecs(locale, engineSuggestions);
  const engineLinks = [
    ...suggestionsToDeepLinks(engineSuggestions),
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
