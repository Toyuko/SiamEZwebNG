import { prisma } from "@/lib/db";
import { parseNotificationPreferences } from "@/lib/notification-preferences";
import { sendJobChatEmail } from "@/lib/email/messages";

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

  sendJobChatEmail({
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    jobTitle: input.jobTitle,
    jobId: input.jobId,
    senderName: input.senderName,
    messagePreview: input.messagePreview,
  });
}
