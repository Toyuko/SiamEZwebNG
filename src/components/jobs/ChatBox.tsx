"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPusherClient,
  jobChatChannel,
  jobPresenceChannel,
} from "@/lib/pusher-client";
import type { SerializedMessage } from "@/data-access/job-chat";
import { cn } from "@/lib/utils";

type ChatBoxProps = {
  jobId: string;
  currentUserId: string;
  otherPartyName: string;
  disabled?: boolean;
};

type LoadState = "loading" | "error" | "ready" | "forbidden";

function formatMessageTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ChatBox({
  jobId,
  currentUserId,
  otherPartyName,
  disabled = false,
}: ChatBoxProps) {
  const t = useTranslations("jobChat");
  const [state, setState] = useState<LoadState>("loading");
  const [messages, setMessages] = useState<SerializedMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/chat/${jobId}`, { credentials: "include" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { messages: SerializedMessage[] };
        error?: string;
      };

      if (res.status === 403) {
        setState("forbidden");
        return;
      }

      if (!res.ok || !json.success || !json.data) {
        setState("error");
        setErrorMessage(json.error ?? t("loadError"));
        return;
      }

      setMessages(json.data.messages);
      setState("ready");
      requestAnimationFrame(scrollToBottom);
    } catch {
      setState("error");
      setErrorMessage(t("loadError"));
    }
  }, [jobId, scrollToBottom, t]);

  useEffect(() => {
    if (!disabled) {
      void loadMessages();
    }
  }, [disabled, loadMessages]);

  useEffect(() => {
    if (disabled || state !== "ready") return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const privateChannel = pusher.subscribe(jobChatChannel(jobId));
    const presenceChannel = pusher.subscribe(jobPresenceChannel(jobId));

    privateChannel.bind("new-message", (message: SerializedMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      requestAnimationFrame(scrollToBottom);
    });

    return () => {
      privateChannel.unbind_all();
      presenceChannel.unbind_all();
      pusher.unsubscribe(jobChatChannel(jobId));
      pusher.unsubscribe(jobPresenceChannel(jobId));
    };
  }, [disabled, jobId, scrollToBottom, state]);

  useEffect(() => {
    if (state === "ready") {
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages.length, scrollToBottom, state]);

  const sendMessage = async (content: string, attachmentUrl?: string | null) => {
    setSending(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/chat/${jobId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachmentUrl: attachmentUrl ?? null }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { message: SerializedMessage };
        error?: string;
      };

      if (!res.ok || !json.success || !json.data?.message) {
        setErrorMessage(json.error ?? t("sendFailed"));
        return;
      }

      const message = json.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setDraft("");
      requestAnimationFrame(scrollToBottom);
    } catch {
      setErrorMessage(t("sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending || uploading) return;
    void sendMessage(trimmed);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || sending || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("file", file);

      const uploadRes = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const uploadJson = (await uploadRes.json()) as {
        success?: boolean;
        data?: { url: string; name: string };
        error?: string;
      };

      if (!uploadRes.ok || !uploadJson.success || !uploadJson.data?.url) {
        setErrorMessage(uploadJson.error ?? t("uploadFailed"));
        return;
      }

      const label = draft.trim() || uploadJson.data.name;
      await sendMessage(label, uploadJson.data.url);
    } catch {
      setErrorMessage(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  if (disabled) {
    return (
      <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900">
        <h3 className="mb-2 text-sm font-semibold text-sky-900 dark:text-sky-100">
          {t("title")}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("unavailable")}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-2xl bg-white/95 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900">
      <header className="border-b border-sky-100 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">{t("title")}</h3>
        <p className="text-xs text-slate-500">{t("with", { name: otherPartyName })}</p>
      </header>

      <div className="min-h-[280px] max-h-[420px] flex-1 overflow-y-auto px-4 py-3" ref={listRef}>
        {state === "loading" && (
          <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loading")}
          </div>
        )}

        {state === "forbidden" && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("forbidden")}</p>
        )}

        {state === "error" && (
          <div className="text-sm text-red-700 dark:text-red-300">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadMessages()}
              className="mt-2 font-medium text-siam-blue underline"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {state === "ready" && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">{t("empty")}</p>
        )}

        {state === "ready" && messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((message) => {
              const isMine = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={cn("flex", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      isMine
                        ? "rounded-br-md bg-siam-blue text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    )}
                  >
                    {message.content && message.content !== "(attachment)" && (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    {message.attachmentUrl && (
                      <a
                        href={message.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "mt-1 inline-block text-xs underline",
                          isMine ? "text-sky-100" : "text-siam-blue"
                        )}
                      >
                        {t("viewAttachment")}
                      </a>
                    )}
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        isMine ? "text-sky-100/80" : "text-slate-400"
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {errorMessage && state === "ready" && (
        <p className="px-4 pb-1 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-sky-100 px-3 py-3 dark:border-slate-700"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => void handleFileSelect(e)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={sending || uploading || state !== "ready"}
          onClick={() => fileInputRef.current?.click()}
          aria-label={t("attachFile")}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("placeholder")}
          disabled={sending || uploading || state !== "ready"}
          className="flex-1"
          maxLength={5000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim() || sending || uploading || state !== "ready"}
          aria-label={t("send")}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
}
