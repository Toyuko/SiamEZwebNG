import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { fail } from "@/lib/api-response";
import { getJobChatParticipant } from "@/data-access/job-chat";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
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

    const privateMatch = channelName.match(/^private-job-chat-(.+)$/);
    const presenceMatch = channelName.match(/^presence-job-chat-(.+)$/);
    const jobId = privateMatch?.[1] ?? presenceMatch?.[1];

    if (!jobId) {
      return fail("Invalid channel", 403);
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
