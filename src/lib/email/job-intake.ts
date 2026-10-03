import { emailLayout, escapeHtml, heading, paragraph } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { renderInvoicePdf } from "@/lib/invoices/render-pdf";

/** Secretary inbox for new jobs that still need to be placed on the office calendar. */
export const JOB_INTAKE_SECRETARY_EMAIL = "suphatsara040526@hotmail.com";

export async function sendJobIntakeNotices(job: {
  customerName: string;
  customerEmail: string;
  invoiceId: string | null;
  invoiceNumber: string;
  jobType: string;
  copyText: string;
}): Promise<{ customerEmailSent: boolean; secretaryEmailSent: boolean }> {
  let pdf: Buffer | null = null;
  if (job.invoiceId) {
    try {
      const rendered = await renderInvoicePdf(job.invoiceId);
      pdf = rendered?.content ?? null;
    } catch (error) {
      console.error("[job-intake] invoice pdf for email failed", error);
    }
  }

  const filename = `invoice-${job.invoiceNumber.replace(/[^\w.-]+/g, "-")}.pdf`;
  const [customer, secretary] = await Promise.all([
    sendEmail({
      to: job.customerEmail,
      subject: `Your SiamEZ invoice ${job.invoiceNumber}`,
      html: emailLayout({
        title: `Invoice ${job.invoiceNumber}`,
        preheader: `Your invoice for ${job.jobType} is attached.`,
        bodyHtml: [
          heading("Your invoice is attached"),
          paragraph(`Hi ${job.customerName},`),
          paragraph(
            `Thank you for booking ${job.jobType} with SiamEZ. Your invoice ${job.invoiceNumber} is attached to this email.`
          ),
          paragraph("Payment details are on the second page of the invoice."),
        ].join(""),
      }),
      attachments: pdf ? [{ filename, content: pdf }] : undefined,
      tags: [{ name: "type", value: "job-intake-invoice" }],
    }),
    sendEmail({
      to: JOB_INTAKE_SECRETARY_EMAIL,
      subject: `New job for the calendar: ${job.customerName} — ${job.jobType}`,
      text: job.copyText,
      html: emailLayout({
        title: "New job for the calendar",
        preheader: `${job.customerName} — ${job.jobType}`,
        bodyHtml: [
          heading("Please add this job to the calendar"),
          paragraph("A confirmed job was just entered. Details are below."),
          `<pre style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;color:#0f172a;">${escapeHtml(job.copyText)}</pre>`,
        ].join(""),
      }),
      tags: [{ name: "type", value: "job-intake-secretary" }],
    }),
  ]);

  if (!customer.ok) console.error("[job-intake] customer invoice email failed", customer.error);
  if (!secretary.ok) console.error("[job-intake] secretary email failed", secretary.error);

  return {
    customerEmailSent: customer.ok,
    secretaryEmailSent: secretary.ok,
  };
}
