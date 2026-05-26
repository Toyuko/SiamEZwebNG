import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api-response";
import { resolveApiUserId } from "@/lib/auth/resolveApiUserId";
import { createJobMessage, getJobMessages } from "@/data-access/job-chat";
import { notifyNewJobMessage } from "@/lib/jobs/notify-message";
import { sendPushNotification } from "@/lib/sendPushNotification";
import {
  getPusherServer,
  isUserActiveInJobChat,
  jobChannel,
} from "@/lib/pusher-server";
import { prisma } from "@/lib/db";

const sendMessageSchema = z.object({
  content: z.string().max(5000).optional().default(""),
  /** Secure blob URL from POST /api/upload?purpose=chat — persisted on Message.attachmentUrl */
  attachmentUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return fail("Unauthorized", 401);
    }

    const { jobId } = await params;
    const payload = await getJobMessages(jobId, userId);

    if (!payload) {
      return fail("Forbidden", 403);
    }

    return ok(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load messages";
    return fail(message, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return fail("Unauthorized", 401);
    }

    const { jobId } = await params;
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid message payload", 400);
    }

    const attachmentUrl =
      typeof parsed.data.attachmentUrl === "string" && parsed.data.attachmentUrl.length > 0
        ? parsed.data.attachmentUrl
        : null;

    const result = await createJobMessage({
      jobId,
      senderId: userId,
      content: parsed.data.content,
      attachmentUrl,
    });

    if (!result) {
      return fail("Forbidden", 403);
    }

    const { message, participant } = result;
    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(jobChannel(jobId), "new-message", message);
    }

    const receiverId = message.receiverId;
    const isActive = await isUserActiveInJobChat(jobId, receiverId);

    if (!isActive) {
      const senderName =
        userId === participant.clientId
          ? participant.clientName
          : participant.freelancerName;
      const preview =
        message.content.trim().length > 0
          ? message.content.trim().slice(0, 120)
          : "Sent an attachment";

      void sendPushNotification(
        receiverId,
        senderName ? `New message from ${senderName}` : "New message",
        preview,
        { jobId, type: "chat_message" }
      );

      const recipient = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { email: true, name: true },
      });

      if (recipient?.email) {
        void notifyNewJobMessage({
          jobId,
          jobTitle: participant.jobTitle,
          recipientId: receiverId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          senderName,
          messagePreview: message.content,
        });
      }
    }

    return ok({ message }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send message";
    return fail(message, message === "Message content or attachment is required" ? 400 : 500);
  }
}
