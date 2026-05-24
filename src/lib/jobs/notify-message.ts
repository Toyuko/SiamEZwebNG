import { prisma } from "@/lib/db";
import { parseNotificationPreferences } from "@/lib/notification-preferences";

/** Notify recipient when they are not active in the job chat. */
export async function notifyNewJobMessage(input: {
  jobId: string;
  jobTitle: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string | null;
  senderName: string | null;
  messagePreview: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.recipientId },
    select: { notificationPreferences: true },
  });

  const prefs = parseNotificationPreferences(user?.notificationPreferences);
  if (!prefs.emailCaseUpdates) {
    return;
  }

  const url = process.env.CONTACT_FORM_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[jobs-chat] CONTACT_FORM_WEBHOOK_URL not set; message notify skipped.");
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "job-chat-message",
        receivedAt: new Date().toISOString(),
        jobId: input.jobId,
        jobTitle: input.jobTitle,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        senderName: input.senderName,
        messagePreview: input.messagePreview.slice(0, 280),
        message: `New message on "${input.jobTitle}" from ${input.senderName ?? "your coordinator"}: ${input.messagePreview.slice(0, 120)}`,
      }),
    });
  } catch (e) {
    console.warn("[jobs-chat] message notify failed:", e);
  }
}
