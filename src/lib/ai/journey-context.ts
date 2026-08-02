/**
 * Platform 2.1 — Concierge journey memory (pure, storage-agnostic).
 * Tracks topics/goals across a customer conversation so replies can adapt
 * and detect when the customer pivots to a new goal.
 */

/** Local locale union — avoid circular import with `@/lib/ai/types`. */
type JourneyLocale = "en" | "th";

export type JourneyTopic =
  | "vehicle"
  | "motorcycle"
  | "property"
  | "services"
  | "life_event"
  | "workflow"
  | "general";

export type JourneyGoalHint = {
  /** Stable key: life-event key, service slug, or topic label */
  key: string;
  label: string;
  source: "message" | "life_event" | "goal" | "booking" | "engagement";
};

export type ConciergeJourneyContext = {
  version: 1;
  topics: JourneyTopic[];
  /** Ordered: most recent active goal first */
  activeGoals: JourneyGoalHint[];
  /** Previous primary goal key (for change detection). */
  previousGoalKey: string | null;
  /** Current primary goal key. */
  primaryGoalKey: string | null;
  messageCount: number;
  lastUserMessage: string | null;
  updatedAt: string;
};

export type GoalChangeSignal = {
  changed: boolean;
  fromKey: string | null;
  toKey: string | null;
  fromLabel: string | null;
  toLabel: string | null;
};

const MOTORCYCLE_RE =
  /motorcycle|motorbike|scooter|\bbike\b|มอเตอร์ไซค์|สกู๊ตเตอร์|บิ๊กไบค์/i;
const VEHICLE_RE =
  /car|vehicle|truck|van|suv|รถยนต์|รถยนต|รถบรรทุก|หาซื้อรถ/i;
const PROPERTY_RE =
  /condo|apartment|house|villa|property|real\s*estate|คอนโด|บ้าน|อพาร์ทเมนท์|อสังหา/i;
const LIFE_EVENT_RE =
  /moving\s+to\s+thailand|relocat|settle\s+in|ย้ายมา|ตั้งถิ่นฐาน|checklist|เช็กลิสต์/i;
const WORKFLOW_RE =
  /inspection|viewing\s+appointment|นัดดู|ตรวจสภาพ/i;
const SERVICE_RE =
  /visa|license|translation|registration|marriage|police|จดทะเบียน|ใบขับขี่|แปล|วีซ่า/i;

export function emptyJourneyContext(): ConciergeJourneyContext {
  return {
    version: 1,
    topics: [],
    activeGoals: [],
    previousGoalKey: null,
    primaryGoalKey: null,
    messageCount: 0,
    lastUserMessage: null,
    updatedAt: new Date().toISOString(),
  };
}

export function isConciergeJourneyContext(
  value: unknown
): value is ConciergeJourneyContext {
  if (!value || typeof value !== "object") return false;
  const v = value as ConciergeJourneyContext;
  return (
    v.version === 1 &&
    Array.isArray(v.topics) &&
    Array.isArray(v.activeGoals) &&
    typeof v.messageCount === "number"
  );
}

export function inferTopicsFromMessage(message: string): JourneyTopic[] {
  const topics: JourneyTopic[] = [];
  if (MOTORCYCLE_RE.test(message)) topics.push("motorcycle", "vehicle");
  else if (VEHICLE_RE.test(message)) topics.push("vehicle");
  if (PROPERTY_RE.test(message)) topics.push("property");
  if (LIFE_EVENT_RE.test(message)) topics.push("life_event");
  if (WORKFLOW_RE.test(message)) topics.push("workflow");
  if (SERVICE_RE.test(message)) topics.push("services");
  if (topics.length === 0 && message.trim()) topics.push("general");
  return [...new Set(topics)];
}

function goalFromTopics(
  topics: JourneyTopic[],
  locale: JourneyLocale
): JourneyGoalHint | null {
  const labels = {
    en: {
      motorcycle: "Find / register a motorcycle",
      vehicle: "Vehicle purchase & paperwork",
      property: "Find a home / property support",
      life_event: "Settling in Thailand",
      workflow: "Book an inspection or viewing",
      services: "Professional services",
      general: "General help",
    },
    th: {
      motorcycle: "หามอเตอร์ไซค์ / จดทะเบียน",
      vehicle: "ซื้อรถและเอกสาร",
      property: "หาที่อยู่อาศัย / อสังหา",
      life_event: "ย้ายมาอยู่ประเทศไทย",
      workflow: "นัดตรวจสภาพหรือดูทรัพย์",
      services: "บริการวิชาชีพ",
      general: "ความช่วยเหลือทั่วไป",
    },
  } as const;
  const copy = labels[locale] ?? labels.en;

  const priority: JourneyTopic[] = [
    "life_event",
    "motorcycle",
    "vehicle",
    "property",
    "workflow",
    "services",
    "general",
  ];
  for (const topic of priority) {
    if (topics.includes(topic)) {
      return {
        key: `topic:${topic}`,
        label: copy[topic],
        source: "message",
      };
    }
  }
  return null;
}

function mergeTopics(
  existing: JourneyTopic[],
  next: JourneyTopic[]
): JourneyTopic[] {
  const out = [...existing];
  for (const t of next) {
    if (!out.includes(t)) out.push(t);
  }
  // Cap memory footprint
  return out.slice(-8);
}

function mergeGoals(
  existing: JourneyGoalHint[],
  incoming: JourneyGoalHint[]
): JourneyGoalHint[] {
  const map = new Map<string, JourneyGoalHint>();
  // Newer first
  for (const g of [...incoming, ...existing]) {
    if (!map.has(g.key)) map.set(g.key, g);
  }
  return [...map.values()].slice(0, 6);
}

/**
 * Fold a new user message (+ optional history goals) into journey memory.
 */
export function updateJourneyContext(input: {
  previous?: ConciergeJourneyContext | null;
  userMessage: string;
  locale: JourneyLocale;
  /** Goals / life events loaded from the customer account */
  historyGoals?: JourneyGoalHint[];
}): { journey: ConciergeJourneyContext; goalChange: GoalChangeSignal } {
  const prev = input.previous && isConciergeJourneyContext(input.previous)
    ? input.previous
    : emptyJourneyContext();

  const topics = mergeTopics(
    prev.topics,
    inferTopicsFromMessage(input.userMessage)
  );
  const messageGoal = goalFromTopics(
    inferTopicsFromMessage(input.userMessage),
    input.locale
  );

  const historyGoals = input.historyGoals ?? [];
  const activeGoals = mergeGoals(
    prev.activeGoals,
    [...(messageGoal ? [messageGoal] : []), ...historyGoals]
  );

  const primary =
    messageGoal ??
    historyGoals[0] ??
    activeGoals[0] ??
    null;
  const primaryGoalKey = primary?.key ?? null;
  const previousGoalKey = prev.primaryGoalKey;

  const changed =
    previousGoalKey != null &&
    primaryGoalKey != null &&
    previousGoalKey !== primaryGoalKey &&
    // Ignore general ↔ general noise; require real pivot
    !previousGoalKey.startsWith("topic:general") &&
    primaryGoalKey !== "topic:general";

  const fromHint =
    prev.activeGoals.find((g) => g.key === previousGoalKey) ?? null;
  const toHint = primary;

  const journey: ConciergeJourneyContext = {
    version: 1,
    topics,
    activeGoals,
    previousGoalKey,
    primaryGoalKey,
    messageCount: prev.messageCount + 1,
    lastUserMessage: input.userMessage.trim().slice(0, 500) || null,
    updatedAt: new Date().toISOString(),
  };

  return {
    journey,
    goalChange: {
      changed,
      fromKey: changed ? previousGoalKey : null,
      toKey: changed ? primaryGoalKey : null,
      fromLabel: changed ? fromHint?.label ?? previousGoalKey : null,
      toLabel: changed ? toHint?.label ?? primaryGoalKey : null,
    },
  };
}

/** Short summary for LLM system prompts / adaptive copy. */
export function formatJourneySummary(
  journey: ConciergeJourneyContext,
  locale: JourneyLocale
): string {
  if (journey.messageCount === 0 && journey.activeGoals.length === 0) {
    return locale === "th"
      ? "ยังไม่มีบริบทการเดินทางของลูกค้า"
      : "No prior customer journey context.";
  }
  const goal =
    journey.activeGoals.find((g) => g.key === journey.primaryGoalKey)?.label ??
    journey.activeGoals[0]?.label;
  const topics = journey.topics.filter((t) => t !== "general").join(", ");
  if (locale === "th") {
    return [
      goal ? `เป้าหมายปัจจุบัน: ${goal}` : null,
      topics ? `หัวข้อที่เกี่ยวข้อง: ${topics}` : null,
      `ข้อความในเซสชัน: ${journey.messageCount}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [
    goal ? `Current goal: ${goal}` : null,
    topics ? `Topics: ${topics}` : null,
    `Messages in session: ${journey.messageCount}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function goalChangeCopy(
  change: GoalChangeSignal,
  locale: JourneyLocale
): string | null {
  if (!change.changed || !change.toLabel) return null;
  if (locale === "th") {
    return change.fromLabel
      ? `ดูเหมือนเป้าหมายเปลี่ยนจาก “${change.fromLabel}” เป็น “${change.toLabel}” — ฉันจะปรับคำแนะนำให้ตรงกับเป้าหมายใหม่`
      : `ตรวจพบเป้าหมายใหม่: “${change.toLabel}” — ฉันจะปรับคำแนะนำให้เหมาะสม`;
  }
  return change.fromLabel
    ? `It looks like your goal shifted from “${change.fromLabel}” to “${change.toLabel}” — I’ll adapt recommendations to match.`
    : `I noticed a new goal: “${change.toLabel}” — I’ll adapt recommendations accordingly.`;
}
