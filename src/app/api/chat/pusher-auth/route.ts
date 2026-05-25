import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getJobChatParticipant } from "@/data-access/job-chat";
import { getPusherServer, privateSpecialJobsChannel } from "@/lib/pusher-server";
import { assertJobLocationViewer } from "@/lib/jobs/tracking-access";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const pusher = getPusherServer();
    if (!pusher) {
      return fail("Real-time chat is not configured", 503);
    }

    const formData = await request.formData();
    const socketId = String(formData.get("socket_id") ?? "");
    const channelName = String(formData.get("channel_name") ?? "");

    if (!socketId || !channelName) {
      return fail("Missing socket_id or channel_name", 400);
    }

    if (channelName === privateSpecialJobsChannel()) {
      if (session.user.role !== "freelancer") {
        return fail("Forbidden", 403);
      }

      const profile = await prisma.freelancerProfile.findUnique({
        where: { userId: session.user.id },
        select: { isSpecialMember: true, verificationStatus: true },
      });

      if (
        !profile?.isSpecialMember ||
        profile.verificationStatus !== "verified"
      ) {
        return fail("Forbidden", 403);
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return new Response(JSON.stringify(authResponse), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const unifiedJobMatch = channelName.match(/^private-job-(?!chat-|location-)(.+)$/);
    const chatLegacyMatch = channelName.match(/^private-job-chat-(.+)$/);
    const presenceMatch = channelName.match(/^presence-job-chat-(.+)$/);
    const locationMatch = channelName.match(/^private-job-location-(.+)$/);
    const jobId =
      unifiedJobMatch?.[1] ??
      chatLegacyMatch?.[1] ??
      presenceMatch?.[1] ??
      locationMatch?.[1];

    if (!jobId) {
      return fail("Invalid channel", 403);
    }

    if (locationMatch) {
      try {
        await assertJobLocationViewer(session.user.id, session.user.role, jobId);
      } catch {
        return fail("Forbidden", 403);
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return new Response(JSON.stringify(authResponse), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const participant = await getJobChatParticipant(jobId, session.user.id);
    if (!participant) {
      return fail("Forbidden", 403);
    }

    const userName = session.user.name ?? session.user.email ?? "User";

    if (presenceMatch) {
      const authResponse = pusher.authorizeChannel(socketId, channelName, {
        user_id: session.user.id,
        user_info: { name: userName },
      });
      return new Response(JSON.stringify(authResponse), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return new Response(JSON.stringify(authResponse), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Auth failed";
    return fail(message, 500);
  }
}
