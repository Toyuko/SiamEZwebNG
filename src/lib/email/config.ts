import { resolvePublicSiteUrl } from "@/config/site-url";
import { site } from "@/config/site";

/** True when Resend can send (API key present). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** From address — prefer verified domain; fall back to Resend onboarding sender for local smoke tests. */
export function getEmailFrom(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  return `${site.name} <onboarding@resend.dev>`;
}

export function getEmailReplyTo(): string {
  return process.env.EMAIL_REPLY_TO?.trim() || site.email;
}

/** Default ops inboxes for contact forms, new users, bookings, and other internal alerts. */
export const DEFAULT_OPS_INBOXES = [
  "touy_smith@hotmail.com",
  "inquiries@siam-ez.com",
] as const;

function parseEmailList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return [
    ...new Set(
      value
        .split(/[,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.includes("@"))
    ),
  ];
}

/** All ops inboxes. Always includes the default pair; EMAIL_OPS_TO can add more. */
export function getOpsInboxes(): string[] {
  const extra = parseEmailList(process.env.EMAIL_OPS_TO);
  return [...new Set([...DEFAULT_OPS_INBOXES, ...extra])];
}

/** Comma-separated ops inboxes (settings UI / status). */
export function getOpsInbox(): string {
  return getOpsInboxes().join(", ");
}

export function getAppBaseUrl(): string {
  return resolvePublicSiteUrl();
}

export function getEmailStatus() {
  const apiKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const from = getEmailFrom();
  const usingResendDev = from.includes("@resend.dev");
  return {
    configured: apiKey,
    from,
    replyTo: getEmailReplyTo(),
    opsTo: getOpsInbox(),
    usingResendDev,
    webhookConfigured: Boolean(process.env.CONTACT_FORM_WEBHOOK_URL?.trim()),
  };
}
