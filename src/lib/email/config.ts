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

/** Ops inbox for contact forms, sales boost, etc. */
export function getOpsInbox(): string {
  return process.env.EMAIL_OPS_TO?.trim() || site.email;
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
