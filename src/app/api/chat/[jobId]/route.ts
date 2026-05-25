import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ok, fail } from "@/lib/api-response";
import { createJobMessage, getJobMessages } from "@/data-access/job-chat";
import { notifyNewJobMessage } from "@/lib/jobs/notify-message";
import {
  getPusherServer,
  isUserActiveInJobChat,
  jobChannel,
} from "@/lib/pusher-server";
import { prisma } from "@/lib/db";

const sendMessageSchema = z.object({
  content: z.string().max(5000).optional().default(""),
  attachmentUrl: z.string().url().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const { jobId } = await params;
    const payload = await getJobMessages(jobId, session.user.id);

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
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const { jobId } = await params;
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid message payload", 400);
    }

    const result = await createJobMessage({
      jobId,
      senderId: session.user.id,
      content: parsed.data.content,
      attachmentUrl: parsed.data.attachmentUrl,
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
      const recipient = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { email: true, name: true },
      });

      if (recipient?.email) {
        const senderName =
          session.user.id === participant.clientId
            ? participant.clientName
            : participant.freelancerName;

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
