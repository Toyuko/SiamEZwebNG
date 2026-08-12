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
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return site.url.replace(/\/$/, "");
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
