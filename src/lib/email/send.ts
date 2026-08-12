import { Resend } from "resend";
import {
  getEmailFrom,
  getEmailReplyTo,
  isEmailConfigured,
} from "@/lib/email/config";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Extra headers / tags for Resend analytics */
  tags?: { name: string; value: string }[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped?: boolean; error: string };

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

/** Strip HTML to a plain-text fallback. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/(h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Send transactional email via Resend.
 * Returns `{ ok: false, skipped: true }` when RESEND_API_KEY is unset (dev-safe).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; email skipped:", input.subject);
    return { ok: false, skipped: true, error: "email_not_configured" };
  }

  const client = getClient();
  if (!client) {
    return { ok: false, skipped: true, error: "email_not_configured" };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const recipients = to.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (recipients.length === 0) {
    return { ok: false, error: "missing_recipient" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getEmailFrom(),
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text ?? htmlToText(input.html),
      replyTo: input.replyTo ?? getEmailReplyTo(),
      tags: input.tags,
    });

    if (error) {
      console.warn("[email] send failed:", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id ?? "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "send_failed";
    console.warn("[email] send threw:", message);
    return { ok: false, error: message };
  }
}

/** Best-effort fire-and-forget (never throws). */
export function sendEmailBackground(input: SendEmailInput): void {
  void sendEmail(input).catch((e) => {
    console.warn("[email] background send failed:", e);
  });
}
