"use client";

import { useEffect, useRef } from "react";
import { ConciergeDeepLinkChips } from "@/components/ai/ConciergeDeepLinkChips";
import { ConciergeServiceChips } from "@/components/ai/ConciergeServiceChips";
import type { ConciergeMessage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type Props = {
  messages: ConciergeMessage[];
  bookLabel: string;
  emptyLabel: string;
  openLinkLabel?: string;
  onLiveChat?: () => void;
};

export function ConciergeMessageList({
  messages,
  bookLabel,
  emptyLabel,
  openLinkLabel = "Open",
  onLiveChat,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div
            key={message.id}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                isUser
                  ? "bg-siam-blue text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              )}
            >
              <p className="whitespace-pre-wrap">
                {message.content}
                {message.streaming ? (
                  <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle opacity-70" />
                ) : null}
              </p>
              {!isUser && message.recommendations?.length ? (
                <ConciergeServiceChips
                  recommendations={message.recommendations}
                  bookLabel={bookLabel}
                />
              ) : null}
              {!isUser && message.deepLinks?.length ? (
                <ConciergeDeepLinkChips
                  links={message.deepLinks}
                  openLabel={openLinkLabel}
                  onLiveChat={onLiveChat}
                />
              ) : null}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
