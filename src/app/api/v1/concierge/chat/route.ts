import { NextRequest } from "next/server";
import { requestConciergeReply } from "@/lib/ai/actions";
import type { ConciergeLocale, ConciergeMessage } from "@/lib/ai/types";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

/**
 * POST /api/v1/concierge/chat
 * Body: { message: string, locale?: "en"|"th", history?: {role,content}[] }
 * Wraps Platform Concierge engine (rule + optional LLM + tools).
 */
export async function POST(request: NextRequest) {
  return withOptionalBearerUser(request, async () => {
    const body = (await request.json().catch(() => null)) as {
      message?: string;
      locale?: ConciergeLocale;
      history?: Pick<ConciergeMessage, "role" | "content">[];
    } | null;

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return apiBadRequest("message is required");

    const locale: ConciergeLocale = body?.locale === "th" ? "th" : "en";
    const history = Array.isArray(body?.history) ? body.history : [];

    const reply = await requestConciergeReply({
      locale,
      userMessage: message,
      messages: [
        ...history,
        { role: "user", content: message },
      ],
    });

    return apiOk(serializeJson(reply));
  });
}
