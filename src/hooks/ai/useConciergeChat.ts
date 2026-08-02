"use client";

import { useCallback, useRef, useState } from "react";
import { requestConciergeReply } from "@/lib/ai/actions";
import {
  createAssistantPlaceholder,
  createUserMessage,
  generateLocalConciergeReply,
} from "@/lib/ai/chat";
import { mockTokenStream } from "@/lib/ai/stream";
import type { ConciergeLocale, ConciergeMessage } from "@/lib/ai/types";

export type UseConciergeChatOptions = {
  locale: ConciergeLocale;
  messages: ConciergeMessage[];
  appendMessage: (message: ConciergeMessage) => void;
  updateMessage: (id: string, patch: Partial<ConciergeMessage>) => void;
  /** Prefer server LLM when available; still mock-streams tokens locally */
  preferLlm?: boolean;
};

export function useConciergeChat({
  locale,
  messages,
  appendMessage,
  updateMessage,
  preferLlm = true,
}: UseConciergeChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  const sendMessage = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || isStreaming) return;

      setError(null);
      const generation = ++abortRef.current;

      const userMsg = createUserMessage(content);
      appendMessage(userMsg);

      const assistant = createAssistantPlaceholder();
      appendMessage(assistant);
      setIsStreaming(true);

      try {
        let reply = generateLocalConciergeReply(content, locale);

        if (preferLlm) {
          try {
            const history = [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            }));
            reply = await requestConciergeReply({
              locale,
              messages: history,
              userMessage: content,
            });
          } catch {
            // keep local rule reply
          }
        }

        if (generation !== abortRef.current) return;

        let streamed = "";
        for await (const chunk of mockTokenStream(reply.content, {
          delayMs: 14,
          chunkSize: 2,
        })) {
          if (generation !== abortRef.current) return;
          streamed = chunk;
          updateMessage(assistant.id, {
            content: streamed,
            streaming: true,
            recommendations: reply.recommendations,
            deepLinks: reply.deepLinks,
            kind:
              reply.recommendations.length > 0 ||
              (reply.deepLinks?.length ?? 0) > 0
                ? "recommendations"
                : "text",
          });
        }

        updateMessage(assistant.id, {
          content: streamed || reply.content,
          streaming: false,
          recommendations: reply.recommendations,
          deepLinks: reply.deepLinks,
          kind:
            reply.recommendations.length > 0 ||
            (reply.deepLinks?.length ?? 0) > 0
              ? "recommendations"
              : "text",
        });
      } catch (e) {
        if (generation !== abortRef.current) return;
        const message =
          e instanceof Error ? e.message : "Concierge reply failed";
        setError(message);
        updateMessage(assistant.id, {
          content:
            locale === "th"
              ? "ขออภัย เกิดข้อผิดพลาด ลองใหม่อีกครั้ง หรือเลือกบริการยอดนิยมด้านล่าง"
              : "Sorry — something went wrong. Try again or pick a popular service below.",
          streaming: false,
        });
      } finally {
        if (generation === abortRef.current) {
          setIsStreaming(false);
        }
      }
    },
    [
      appendMessage,
      isStreaming,
      locale,
      messages,
      preferLlm,
      updateMessage,
    ]
  );

  const cancelStream = useCallback(() => {
    abortRef.current += 1;
    setIsStreaming(false);
  }, []);

  return {
    sendMessage,
    cancelStream,
    isStreaming,
    error,
  };
}
