/**
 * Build human-escalation deep links (WhatsApp / LINE) with conversation context.
 */

import { site } from "@/config/site";
import type { ConciergeDeepLink } from "@/lib/ai/types";

export type EscalateHumanInput = {
  /** User message or summary to pre-fill for staff. */
  context?: string;
  locale?: "en" | "th";
};

export type EscalateHumanResult = {
  whatsappUrl: string;
  lineUrl: string;
  phone: string;
  email: string;
  /** Short label for Concierge deep-link chips. */
  whatsappLabel: string;
  lineLabel: string;
  message: string;
};

const LABELS = {
  en: {
    whatsapp: "Chat on WhatsApp",
    line: "Message on LINE",
    message:
      "I'll connect you with a SiamEZ coordinator. Tap WhatsApp or LINE below — your message will include context from this chat.",
  },
  th: {
    whatsapp: "แชทผ่าน WhatsApp",
    line: "ส่งข้อความทาง LINE",
    message:
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

/** Concierge tool: escalate to a human coordinator via WhatsApp or LINE. */
export function escalateHumanTool(input: EscalateHumanInput = {}): EscalateHumanResult {
  const locale = input.locale === "th" ? "th" : "en";
  const labels = LABELS[locale];
  return {
    whatsappUrl: buildWhatsAppUrl(input.context),
    lineUrl: site.lineUrl,
    phone: site.phone,
    email: site.email,
    whatsappLabel: labels.whatsapp,
    lineLabel: labels.line,
    message: labels.message,
  };
}

export function escalationDeepLinks(result: EscalateHumanResult): ConciergeDeepLink[] {
  return [
    {
      href: result.whatsappUrl,
      label: result.whatsappLabel,
      kind: "search",
    },
    {
      href: result.lineUrl,
      label: result.lineLabel,
      kind: "search",
    },
  ];
}
