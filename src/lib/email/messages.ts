import { site } from "@/config/site";
import { getAppBaseUrl, getOpsInbox } from "@/lib/email/config";
import {
  ctaButton,
  detailTable,
  emailLayout,
  escapeHtml,
  heading,
  paragraph,
} from "@/lib/email/layout";
import { sendEmail, sendEmailBackground, type SendEmailResult } from "@/lib/email/send";

async function postOptionalWebhook(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.CONTACT_FORM_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, receivedAt: new Date().toISOString() }),
    });
  } catch (e) {
    console.warn("[email] webhook bridge failed:", e);
  }
}

function portalUrl(path: string): string {
  const base = getAppBaseUrl();
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}/en${clean}`;
}

export async function sendContactFormEmails(input: {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message?: string;
}): Promise<SendEmailResult> {
  const opsHtml = emailLayout({
    title: "New contact request",
    preheader: `${input.name} — ${input.service}`,
    bodyHtml: [
      heading("New website contact"),
      detailTable([
        { label: "Name", value: input.name },
        { label: "Email", value: input.email },
        ...(input.phone ? [{ label: "Phone", value: input.phone }] : []),
        { label: "Service", value: input.service },
      ]),
      input.message
        ? `<p style="margin:0;font-size:15px;line-height:1.55;color:#334155;white-space:pre-wrap;">${escapeHtml(input.message)}</p>`
        : "",
    ].join(""),
  });

  const ackHtml = emailLayout({
    title: "We received your message",
    preheader: "Thanks for contacting SiamEZ",
    bodyHtml: [
      heading("Thanks for reaching out"),
      paragraph(`Hi ${input.name},`),
      paragraph(
        `We received your request about ${input.service}. Our team will reply to this email shortly.`
      ),
      paragraph(`If you need faster help, message us on LINE (${site.line}) or call ${site.phone}.`),
      ctaButton(portalUrl("/contact"), "Visit SiamEZ"),
    ].join(""),
  });

  void postOptionalWebhook({
    source: "website-contact-form",
    ...input,
  });

  const [ops] = await Promise.all([
    sendEmail({
      to: getOpsInbox(),
      subject: `[SiamEZ] Contact: ${input.service} — ${input.name}`,
      html: opsHtml,
      replyTo: input.email,
      tags: [{ name: "type", value: "contact-form" }],
    }),
    sendEmail({
      to: input.email,
      subject: "We received your message — SiamEZ",
      html: ackHtml,
      tags: [{ name: "type", value: "contact-ack" }],
    }),
  ]);

  return ops;
}

export async function sendFreelancerInquiryEmails(input: {
  freelancerName: string | null;
  freelancerEmail: string | null | undefined;
  freelancerSlug: string;
  fromName: string;
  fromEmail: string;
  fromPhone?: string;
  message: string;
}): Promise<SendEmailResult> {
  void postOptionalWebhook({
    type: "freelancer-inquiry",
    ...input,
  });

  if (!input.freelancerEmail) {
    return sendEmail({
      to: getOpsInbox(),
      subject: `[SiamEZ] Freelancer inquiry (no owner email): ${input.freelancerSlug}`,
      html: emailLayout({
        title: "Freelancer inquiry",
        bodyHtml: [
          heading("Freelancer inquiry"),
          paragraph("The freelancer profile has no email on file — routing to ops."),
          detailTable([
            { label: "Freelancer", value: input.freelancerName ?? input.freelancerSlug },
            { label: "From", value: `${input.fromName} <${input.fromEmail}>` },
            ...(input.fromPhone ? [{ label: "Phone", value: input.fromPhone }] : []),
          ]),
          `<p style="white-space:pre-wrap;">${escapeHtml(input.message)}</p>`,
        ].join(""),
      }),
      replyTo: input.fromEmail,
      tags: [{ name: "type", value: "freelancer-inquiry-ops" }],
    });
  }

  return sendEmail({
    to: input.freelancerEmail,
    subject: `New inquiry via SiamEZ — ${input.fromName}`,
    html: emailLayout({
      title: "New inquiry",
      preheader: `Message from ${input.fromName}`,
      bodyHtml: [
        heading("Someone wants to work with you"),
        paragraph(`Hi ${input.freelancerName ?? "there"},`),
        paragraph("You received a new inquiry from your public SiamEZ profile."),
        detailTable([
          { label: "From", value: input.fromName },
          { label: "Email", value: input.fromEmail },
          ...(input.fromPhone ? [{ label: "Phone", value: input.fromPhone }] : []),
        ]),
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#334155;white-space:pre-wrap;">${escapeHtml(input.message)}</p>`,
        ctaButton(portalUrl("/portal"), "Open portal"),
      ].join(""),
    }),
    replyTo: input.fromEmail,
    tags: [{ name: "type", value: "freelancer-inquiry" }],
  });
}

export function sendBookingConfirmationEmail(input: {
  to: string;
  name: string | null;
  caseNumber: string;
  caseId: string;
  serviceName: string;
  isGuest: boolean;
  isFixed: boolean;
  guestCheckoutToken?: string;
}): void {
  const checkoutPath =
    input.isGuest && input.guestCheckoutToken
      ? `/checkout/${input.caseId}?token=${encodeURIComponent(input.guestCheckoutToken)}`
      : `/portal/cases/${input.caseId}`;

  const nextStep = input.isFixed
    ? "Complete payment when ready so we can start your case."
    : "Our team will review your request and send a quote.";

  sendEmailBackground({
    to: input.to,
    subject: `Booking received — ${input.caseNumber}`,
    html: emailLayout({
      title: "Booking confirmation",
      preheader: `${input.serviceName} · ${input.caseNumber}`,
      bodyHtml: [
        heading("We received your booking"),
        paragraph(`Hi ${input.name?.trim() || "there"},`),
        paragraph(`Thanks for choosing ${site.name}. Your case is on file.`),
        detailTable([
          { label: "Case", value: input.caseNumber },
          { label: "Service", value: input.serviceName },
          { label: "Type", value: input.isFixed ? "Fixed price" : "Custom quote" },
        ]),
        paragraph(nextStep),
        ctaButton(portalUrl(checkoutPath), input.isFixed ? "View checkout" : "View case"),
      ].join(""),
    }),
    tags: [{ name: "type", value: "booking-confirmation" }],
  });

  void postOptionalWebhook({
    source: "booking-confirmation",
    caseNumber: input.caseNumber,
    serviceName: input.serviceName,
    to: input.to,
  });
}

export function sendWelcomeEmail(input: {
  to: string;
  name: string | null;
  role: string;
}): void {
  sendEmailBackground({
    to: input.to,
    subject: `Welcome to ${site.name}`,
    html: emailLayout({
      title: "Welcome",
      preheader: "Your account is ready",
      bodyHtml: [
        heading(`Welcome${input.name ? `, ${input.name.split(" ")[0]}` : ""}`),
        paragraph(`Your ${input.role} account on ${site.name} is ready.`),
        paragraph("Sign in anytime to track cases, documents, and messages."),
        ctaButton(portalUrl("/portal"), "Open your portal"),
      ].join(""),
    }),
    tags: [{ name: "type", value: "welcome" }],
  });
}

export function sendPasswordResetEmail(input: {
  to: string;
  name: string | null;
  resetUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: "Reset your SiamEZ password",
    html: emailLayout({
      title: "Password reset",
      preheader: "Reset link expires in 1 hour",
      bodyHtml: [
        heading("Reset your password"),
        paragraph(`Hi ${input.name?.trim() || "there"},`),
        paragraph("We received a request to reset your SiamEZ password. This link expires in 1 hour."),
        ctaButton(input.resetUrl, "Choose a new password"),
        paragraph("If you did not request this, you can ignore this email."),
      ].join(""),
    }),
    tags: [{ name: "type", value: "password-reset" }],
  });
}

export function sendJobCompletedEmail(input: {
  clientEmail: string;
  clientName: string | null;
  jobTitle: string;
  jobId: string;
  freelancerName: string | null;
}): void {
  sendEmailBackground({
    to: input.clientEmail,
    subject: `Job marked complete — ${input.jobTitle}`,
    html: emailLayout({
      title: "Job completed",
      bodyHtml: [
        heading("Work marked complete"),
        paragraph(`Hi ${input.clientName?.trim() || "there"},`),
        paragraph(
          `${input.freelancerName ?? "Your freelancer"} marked “${input.jobTitle}” as done. Auto-approval runs in 60 minutes unless you review sooner.`
        ),
        ctaButton(portalUrl(`/portal/jobs/${input.jobId}`), "Review job"),
      ].join(""),
    }),
    tags: [{ name: "type", value: "job-completed" }],
  });
  void postOptionalWebhook({
    source: "freelancer-job-completed",
    ...input,
    message: `Freelancer marked "${input.jobTitle}" as done.`,
  });
}

export function sendJobChatEmail(input: {
  recipientEmail: string;
  recipientName: string | null;
  jobTitle: string;
  jobId: string;
  senderName: string | null;
  messagePreview: string;
}): void {
  const preview = input.messagePreview.slice(0, 280);
  sendEmailBackground({
    to: input.recipientEmail,
    subject: `New message — ${input.jobTitle}`,
    html: emailLayout({
      title: "New chat message",
      bodyHtml: [
        heading("New message on your job"),
        paragraph(`Hi ${input.recipientName?.trim() || "there"},`),
        paragraph(
          `${input.senderName ?? "Your coordinator"} wrote on “${input.jobTitle}”:`
        ),
        `<blockquote style="margin:0 0 16px;padding:12px 14px;border-left:4px solid #ffce2d;background:#f7f9ff;color:#334155;font-size:14px;line-height:1.55;border-radius:0 8px 8px 0;">${escapeHtml(preview)}</blockquote>`,
        ctaButton(portalUrl(`/portal/jobs/${input.jobId}`), "Open chat"),
      ].join(""),
    }),
    tags: [{ name: "type", value: "job-chat" }],
  });
  void postOptionalWebhook({
    source: "job-chat-message",
    ...input,
    messagePreview: preview,
  });
}

export function sendPayoutEmail(input: {
  freelancerEmail: string;
  freelancerName: string | null;
  jobTitle: string;
  payoutAmount: number;
  currency: string;
}): void {
  const amount = (input.payoutAmount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  sendEmailBackground({
    to: input.freelancerEmail,
    subject: `Payout released — ${input.jobTitle}`,
    html: emailLayout({
      title: "Payout released",
      bodyHtml: [
        heading("Payout released"),
        paragraph(`Hi ${input.freelancerName?.trim() || "there"},`),
        paragraph(`A payout for “${input.jobTitle}” is ready.`),
        detailTable([
          { label: "Amount", value: `${amount} ${input.currency}` },
          { label: "Job", value: input.jobTitle },
        ]),
        ctaButton(portalUrl("/portal"), "Open portal"),
      ].join(""),
    }),
    tags: [{ name: "type", value: "payout" }],
  });
  void postOptionalWebhook({
    source: "freelancer-job-payout",
    ...input,
    message: `Payout released for job "${input.jobTitle}".`,
  });
}

export function sendSalesBoostPendingEmail(input: {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  boostTier: string;
  priceThb: number;
}): void {
  sendEmailBackground({
    to: getOpsInbox(),
    subject: `[SiamEZ] Sales boost bank slip — ${input.make} ${input.model}`,
    html: emailLayout({
      title: "Sales boost pending",
      bodyHtml: [
        heading("Bank transfer boost submitted"),
        detailTable([
          { label: "Vehicle", value: `${input.year} ${input.make} ${input.model}` },
          { label: "Tiers", value: input.boostTier },
          { label: "Price", value: `฿${input.priceThb.toLocaleString()}` },
          { label: "Vehicle ID", value: input.vehicleId },
        ]),
        ctaButton(portalUrl("/admin/sales"), "Review in admin"),
      ].join(""),
    }),
    tags: [{ name: "type", value: "sales-boost" }],
  });
  void postOptionalWebhook({
    source: "sales-boost-pending-bank-transfer",
    ...input,
  });
}

export function sendListingEnquiryEmail(input: {
  ownerEmail: string;
  ownerName: string | null;
  listingType: string;
  listingTitle: string;
  fromName: string;
  fromEmail: string;
  fromPhone?: string | null;
  message: string;
}): void {
  sendEmailBackground({
    to: input.ownerEmail,
    subject: `New listing enquiry — ${input.listingTitle}`,
    html: emailLayout({
      title: "Listing enquiry",
      bodyHtml: [
        heading("New enquiry on your listing"),
        paragraph(`Hi ${input.ownerName?.trim() || "there"},`),
        paragraph(`Someone asked about your ${input.listingType} listing.`),
        detailTable([
          { label: "Listing", value: input.listingTitle },
          { label: "From", value: input.fromName },
          { label: "Email", value: input.fromEmail },
          ...(input.fromPhone ? [{ label: "Phone", value: input.fromPhone }] : []),
        ]),
        `<p style="white-space:pre-wrap;">${escapeHtml(input.message)}</p>`,
        ctaButton(portalUrl("/portal"), "Open portal"),
      ].join(""),
    }),
    replyTo: input.fromEmail,
    tags: [{ name: "type", value: "listing-enquiry" }],
  });
}

export function sendMarketplaceJobEmails(input: {
  jobId: string;
  recipients: { email: string; name: string | null }[];
  budgetLabel: string;
}): void {
  for (const r of input.recipients) {
    sendEmailBackground({
      to: r.email,
      subject: "New marketplace job on SiamEZ",
      html: emailLayout({
        title: "New marketplace job",
        bodyHtml: [
          heading("A new job is open"),
          paragraph(`Hi ${r.name?.trim() || "there"},`),
          paragraph("A new marketplace job was posted that may match your profile."),
          detailTable([{ label: "Budget", value: input.budgetLabel }]),
          ctaButton(portalUrl("/portal/freelancer"), "Browse jobs"),
        ].join(""),
      }),
      tags: [{ name: "type", value: "marketplace-job" }],
    });
  }
}

export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `[SiamEZ] Email test ${new Date().toISOString()}`,
    html: emailLayout({
      title: "Email test",
      bodyHtml: [
        heading("Email pipeline OK"),
        paragraph("If you can read this, Resend delivery is working for SiamEZ."),
        detailTable([
          { label: "Sent at", value: new Date().toISOString() },
          { label: "App", value: getAppBaseUrl() },
        ]),
      ].join(""),
    }),
    tags: [{ name: "type", value: "test" }],
  });
}
