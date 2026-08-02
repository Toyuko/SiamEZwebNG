/**
 * Strip invented / placeholder URLs from Concierge LLM text.
 * Models often echo prompt templates like `/sales/{cuid}` literally.
 */

const PLACEHOLDER_TOKEN_RE = /\{(?:cuid|id|slug|listingId|listing_id)\}/i;

/** Any markdown link whose href still contains a placeholder token. */
const BAD_MD_LINK_RE =
  /\[[^\]]*]\([^)]*\{(?:cuid|id|slug|listingId|listing_id)\}[^)]*\)/gi;

/** Bare absolute or relative placeholder listing paths. */
const BAD_BARE_LISTING_URL_RE =
  /(?:https?:\/\/[^\s)\]>"']+)?\/(?:sales|real-estate)\/\{[^}\s)\]>"']+\}/gi;

/** Any remaining absolute URL that still embeds a placeholder token. */
const BAD_ABSOLUTE_PLACEHOLDER_RE =
  /https?:\/\/[^\s)\]>"']*\{(?:cuid|id|slug|listingId|listing_id)\}[^\s)\]>"']*/gi;
export function containsPlaceholderUrl(text: string): boolean {
  return PLACEHOLDER_TOKEN_RE.test(text);
}

/**
 * Remove placeholder listing URLs the model invented from the prompt template.
 * Leaves prose intact; drops bad markdown links and bare bad paths.
 */
export function sanitizeConciergeContent(content: string): string {
  let out = content;

  out = out.replace(BAD_MD_LINK_RE, (match) => {
    const label = match.match(/^\[([^\]]*)]/)?.[1]?.trim();
    return label || "";
  });

  out = out.replace(BAD_BARE_LISTING_URL_RE, "");
  out = out.replace(BAD_ABSOLUTE_PLACEHOLDER_RE, "");

  // Collapse leftover empty markdown artifacts and messy punctuation/spacing.
  out = out
    .replace(/\[[^\]]*]\(\s*\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();

  return out;
}

export type ConciergePromptContext = {
  locale: "en" | "th";
  allowedBookPaths: Array<{ name: string; href: string }>;
  knownListingPaths: Array<{ label: string; href: string }>;
  /** Platform 2.1 journey memory summary for adaptive replies */
  journeySummary?: string;
};

export function buildConciergeSystemPrompt(ctx: ConciergePromptContext): string {
  const bookLines =
    ctx.allowedBookPaths.length > 0
      ? ctx.allowedBookPaths.map((p) => `- ${p.name}: ${p.href}`).join("\n")
      : "- (none for this turn — ask the user to use Book chips below)";

  const listingLines =
    ctx.knownListingPaths.length > 0
      ? ctx.knownListingPaths.map((p) => `- ${p.label}: ${p.href}`).join("\n")
      : "- (none — do not invent any /sales or /real-estate links)";

  const journeyLine =
    ctx.journeySummary?.trim() ?
      ctx.locale === "th"
        ? `บริบทการเดินทางของลูกค้า: ${ctx.journeySummary}`
        : `Customer journey context: ${ctx.journeySummary}`
    : null;

  if (ctx.locale === "th") {
    return [
      "คุณคือ SiamEZ Concierge ผู้ช่วยแพลตฟอร์มบริการและการจองในประเทศไทย",
      "ตอบสั้น ชัด เป็นมิตร เป็นภาษาไทย",
      "ปรับคำตอบตามบริบทการเดินทางของลูกค้าเมื่อมี และอธิบายสั้นๆ ว่าทำไมถึงแนะนำ",
      journeyLine,
      "",
      "กฎลิงก์ (สำคัญมาก):",
      "- ห้ามประดิษฐ์ URL และห้ามเขียน {cuid} {id} {slug} หรือ placeholder อื่นๆ",
      "- ห้ามใส่โดเมนเช่น https://siamez.com หรือ https://siam-ez.com ในคำตอบ",
      "- สำหรับบริการแคตตาล็อก แนะนำให้กดปุ่ม Book ด้านล่าง หรือใช้ path จองจริงจากรายการ Allowed booking paths เท่านั้น (เช่น /book/driver-license)",
      "- ลิงก์รายการรถ/อสังหาใช้ได้เฉพาะ path จริงจาก Known listings เท่านั้น",
      "- อย่าใช้ /sales/{cuid} หรือ /real-estate/{cuid} เป็นตัวอย่างในคำตอบ",
      "",
      "Allowed booking paths:",
      bookLines,
      "",
      "Known listings:",
      listingLines,
    ]
      .filter((line): line is string => line != null)
      .join("\n");
  }

  return [
    "You are the SiamEZ Concierge for Thailand services + marketplace booking.",
    "Keep answers short, clear, and friendly.",
    "Adapt to the customer's journey context when available and briefly explain why you recommend something.",
    journeyLine,
    "",
    "URL rules (critical):",
    "- NEVER invent URLs. NEVER write {cuid}, {id}, {slug}, or any placeholder token.",
    "- NEVER invent absolute domains (siamez.com, siam-ez.com, etc.).",
    "- For catalog services, nudge users to the Book buttons below, or use only real relative booking paths from Allowed booking paths (e.g. /book/driver-license).",
    "- Marketplace listing links are allowed ONLY when listed under Known listings as real /sales/<cuid> or /real-estate/<cuid> paths.",
    "- Do not echo template examples like /sales/{cuid} or /real-estate/{cuid} in your reply.",
    "- Prefer no markdown links unless the href is one of the allowed paths above.",
    "",
    "Allowed booking paths:",
    bookLines,
    "",
    "Known listings:",
    listingLines,
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}
