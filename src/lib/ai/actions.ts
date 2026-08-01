"use server";

import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import { attachRecommendations, generateLocalConciergeReply } from "@/lib/ai/chat";
import type { ConciergeLocale, ConciergeMessage, ConciergeReply } from "@/lib/ai/types";

export type ConciergeCapability = {
  llmEnabled: boolean;
};

export async function getConciergeCapability(): Promise<ConciergeCapability> {
  return { llmEnabled: isConciergeLlmConfigured() };
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

/**
 * Server-side concierge reply. Uses OpenAI / AI Gateway when configured;
 * otherwise returns the same rule-based reply as the client fallback.
 */
export async function requestConciergeReply(input: {
  locale: ConciergeLocale;
  messages: Pick<ConciergeMessage, "role" | "content">[];
  userMessage: string;
}): Promise<ConciergeReply> {
  const { locale, userMessage, messages } = input;

  if (!isConciergeLlmConfigured()) {
    return generateLocalConciergeReply(userMessage, locale);
  }

  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) {
    return generateLocalConciergeReply(userMessage, locale);
  }

  const systemPrompt =
    locale === "th"
      ? "คุณคือ SiamEZ Concierge ผู้ช่วยบริการในประเทศไทย แนะนำบริการจากแคตตาล็อกเท่านั้น และแนะนำให้ผู้ใช้กดจองเพื่อเปิดวิซาร์ด /book/[slug] ตอบสั้น ชัด เป็นมิตร เป็นภาษาไทย"
      : "You are the SiamEZ Concierge for professional services in Thailand. Recommend only catalog services and nudge users to Book to open the /book/[slug] wizard. Keep answers short, clear, and friendly.";

  try {
    const res = await fetch(getConciergeLlmEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getConciergeModel(),
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return generateLocalConciergeReply(userMessage, locale);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return generateLocalConciergeReply(userMessage, locale);
    }

    return attachRecommendations(content, userMessage, locale);
  } catch {
    return generateLocalConciergeReply(userMessage, locale);
  }
}
