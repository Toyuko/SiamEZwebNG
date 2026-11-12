import { getAppBaseUrl } from "@/lib/email/config";
import { ctaButton, emailLayout, heading, paragraph } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/db";
import { parseNotificationPreferences } from "@/lib/notification-preferences";
import { sendPushNotification } from "@/lib/sendPushNotification";

export type LicenceNoticeTemplate =
  | "corrections"
  | "screening_passed"
  | "manual_review"
  | "quotation_ready"
  | "rejected"
  | "message"
  | "appointment_confirmed"
  | "appointment_reminder";

const SUBJECTS: Record<LicenceNoticeTemplate, { en: string; th: string }> = {
  corrections: {
    en: "SiamEZ needs a few document updates",
    th: "SiamEZ ต้องการให้แก้ไขเอกสารบางส่วน",
  },
  screening_passed: {
    en: "SiamEZ has received your driving licence documents",
    th: "SiamEZ ได้รับเอกสารใบขับขี่ของคุณแล้ว",
  },
  manual_review: {
    en: "SiamEZ is reviewing your driving licence file",
    th: "SiamEZ กำลังตรวจสอบไฟล์ใบขับขี่ของคุณ",
  },
  quotation_ready: {
    en: "Your SiamEZ driving licence quotation is ready to review",
    th: "ใบเสนอราคาใบขับขี่ SiamEZ พร้อมให้ตรวจสอบ",
  },
  rejected: {
    en: "Update on your SiamEZ driving licence application",
    th: "อัปเดตคำขอใบขับขี่ SiamEZ",
  },
  message: {
    en: "A message from SiamEZ about your driving licence application",
    th: "ข้อความจาก SiamEZ เกี่ยวกับคำขอใบขับขี่",
  },
  appointment_confirmed: {
    en: "Your DLT appointment details from SiamEZ",
    th: "รายละเอียดนัดหมายกรมการขนส่งทางบกจาก SiamEZ",
  },
  appointment_reminder: {
    en: "Reminder: your DLT appointment is coming up",
    th: "เตือนนัดหมายกรมการขนส่งทางบก",
  },
};

export async function notifyLicenceCustomer(input: {
  applicationId: string;
  template: LicenceNoticeTemplate;
  summary: string;
  token: string;
  locale: string;
  email: string;
  userId: string | null;
  referenceNumber: string;
}): Promise<void> {
  const locale = input.locale === "th" ? "th" : "en";
  const subject = SUBJECTS[input.template][locale];
  const link = `${getAppBaseUrl()}/${locale}/driving-licence/track/${input.token}`;
  let skipReason: string | null = null;
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { notificationPreferences: true, expoPushToken: true },
    });
    const prefs = parseNotificationPreferences(user?.notificationPreferences);
    if (!prefs.emailDocumentAlerts) skipReason = "The customer turned off document emails.";
    if (prefs.pushEnabled) {
      try {
        await sendPushNotification(input.userId, subject, input.summary, {
          applicationId: input.applicationId,
        });
        await prisma.licenceCustomerNotification.create({
          data: {
            applicationId: input.applicationId,
            channel: "push",
            templateKey: input.template,
            toAddress: input.userId,
            subject,
            bodySummary: input.summary,
            status: "SENT",
          },
        });
      } catch (error) {
        await prisma.licenceCustomerNotification.create({
          data: {
            applicationId: input.applicationId,
            channel: "push",
            templateKey: input.template,
            toAddress: input.userId,
            subject,
            bodySummary: input.summary,
            status: "FAILED",
            error: error instanceof Error ? error.message : "Push failed",
          },
        });
      }
    }
  }

  if (skipReason) {
    await prisma.licenceCustomerNotification.create({
      data: {
        applicationId: input.applicationId,
        channel: "email",
        templateKey: input.template,
        toAddress: input.email,
        subject,
        bodySummary: input.summary,
        status: "SKIPPED",
        error: skipReason,
      },
    });
    return;
  }

  const html = emailLayout({
    title: subject,
    preheader: input.referenceNumber,
    bodyHtml: [
      heading(subject),
      paragraph(input.summary),
      paragraph(
        locale === "th"
          ? "นี่เป็นการตรวจสอบเอกสารเบื้องต้นของ SiamEZ ไม่ใช่การอนุมัติจากกรมการขนส่งทางบก"
          : "This is SiamEZ’s initial document check. It is not approval from the Department of Land Transport."
      ),
      ctaButton(link, locale === "th" ? "เปิดคำขอ" : "Open your application"),
    ].join(""),
  });

  const result = await sendEmail({
    to: input.email,
    subject: `[${input.referenceNumber}] ${subject}`,
    html,
  });
  await prisma.licenceCustomerNotification.create({
    data: {
      applicationId: input.applicationId,
      channel: "email",
      templateKey: input.template,
      toAddress: input.email,
      subject,
      bodySummary: input.summary,
      status: result.ok ? "SENT" : "FAILED",
      error: result.ok ? null : result.error,
    },
  });
}
