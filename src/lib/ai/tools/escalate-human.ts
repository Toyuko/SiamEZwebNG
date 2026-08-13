/**
 * Build human-escalation deep links (tawk.to live chat / WhatsApp / LINE)
 * with conversation context.
 */

import { site } from "@/config/site";
import { isTawkConfigured, TAWK_OPEN_HREF } from "@/lib/tawk";
import type { ConciergeDeepLink } from "@/lib/ai/types";

export type EscalateHumanInput = {
  /** User message or summary to pre-fill for staff. */
  context?: string;
  locale?: "en" | "th";
  /** Override env detection (tests). */
  tawkEnabled?: boolean;
};

export type EscalateHumanResult = {
  whatsappUrl: string;
  lineUrl: string;
  phone: string;
  email: string;
  /** Short label for Concierge deep-link chips. */
  whatsappLabel: string;
  lineLabel: string;
  liveChatEnabled: boolean;
  liveChatHref: string;
  liveChatLabel: string;
  message: string;
};

const LABELS = {
  en: {
    whatsapp: "Chat on WhatsApp",
    line: "Message on LINE",
    liveChat: "Chat with staff",
    withLiveChat:
      "I'll connect you with a SiamEZ coordinator. Live chat is opening now — you can also use WhatsApp or LINE.",
    withoutLiveChat:
      "I'll connect you with a SiamEZ coordinator. Tap WhatsApp or LINE below — your message will include context from this chat.",
  },
  th: {
    whatsapp: "แชทผ่าน WhatsApp",
    line: "ส่งข้อความทาง LINE",
    liveChat: "แชทกับเจ้าหน้าที่",
    withLiveChat:
      "ฉันจะเชื่อมต่อคุณกับผู้ประสานงาน SiamEZ แชทสดกำลังเปิด — หรือใช้ WhatsApp หรือ LINE ก็ได้",
    withoutLiveChat:
      "ฉันจะเชื่อมต่อคุณกับผู้ประสานงาน SiamEZ กด WhatsApp หรือ LINE ด้านล่าง — ข้อความจะมีบริบทจากแชทนี้",
  },
} as const;

function buildWhatsAppUrl(context?: string): string {
  const phone = site.phone.replace(/\D/g, "");
  const prefix =
    context?.trim() ?
      `[SiamEZ Concierge] ${context.trim().slice(0, 500)}`
    : "Hi SiamEZ — I need help from the Concierge.";
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(prefix)}&type=phone_number&app_absent=0`;
}

/**
 * Concierge tool: escalate to a human coordinator via tawk.to (when
 * configured), with WhatsApp / LINE as fallbacks.
 */
export function escalateHumanTool(input: EscalateHumanInput = {}): EscalateHumanResult {
  const locale = input.locale === "th" ? "th" : "en";
  const labels = LABELS[locale];
  const liveChatEnabled = input.tawkEnabled ?? isTawkConfigured();
  return {
    whatsappUrl: buildWhatsAppUrl(input.context),
    lineUrl: site.lineUrl,
    phone: site.phone,
    email: site.email,
    whatsappLabel: labels.whatsapp,
    lineLabel: labels.line,
    liveChatEnabled,
    liveChatHref: TAWK_OPEN_HREF,
    liveChatLabel: labels.liveChat,
    message: liveChatEnabled ? labels.withLiveChat : labels.withoutLiveChat,
  };
}

export function escalationDeepLinks(result: EscalateHumanResult): ConciergeDeepLink[] {
  const links: ConciergeDeepLink[] = [];
  if (result.liveChatEnabled) {
    links.push({
      href: result.liveChatHref,
      label: result.liveChatLabel,
      kind: "live_chat",
    });
  }
  links.push(
    {
      href: result.whatsappUrl,
      label: result.whatsappLabel,
      kind: "search",
    },
    {
      href: result.lineUrl,
      label: result.lineLabel,
      kind: "search",
    }
  );
  return links;
}
