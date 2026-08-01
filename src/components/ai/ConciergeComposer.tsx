"use client";

import { useState } from "react";
import { mapVoiceErrorLabel, useConciergeVoice } from "@/hooks/ai/useConciergeVoice";
import type { ConciergeLocale } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Send } from "lucide-react";

type Props = {
  locale: ConciergeLocale;
  disabled?: boolean;
  onSend: (message: string) => void;
  labels: {
    placeholder: string;
    send: string;
    listening: string;
    voiceAria: string;
    voiceUnsupported: string;
    voicePermissionDenied: string;
    voiceNoSpeech: string;
    voiceError: string;
  };
};

export function ConciergeComposer({ locale, disabled, onSend, labels }: Props) {
  const [value, setValue] = useState("");

  const voice = useConciergeVoice({
    locale,
    onTranscript: (transcript) => {
      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    },
  });

  const voiceError = mapVoiceErrorLabel(voice.error, {
    unsupported: labels.voiceUnsupported,
    permissionDenied: labels.voicePermissionDenied,
    noSpeech: labels.voiceNoSpeech,
    error: labels.voiceError,
  });

  const submit = () => {
    const next = value.trim();
    if (!next || disabled) return;
    onSend(next);
    setValue("");
  };

  return (
    <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
      {voiceError ? (
        <p className="mb-1.5 text-[11px] text-amber-700 dark:text-amber-300">{voiceError}</p>
      ) : null}
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={voice.toggleListening}
          disabled={!voice.isSupported || disabled}
          aria-label={voice.isListening ? labels.listening : labels.voiceAria}
          aria-pressed={voice.isListening}
          title={
            !voice.isSupported
              ? labels.voiceUnsupported
              : voice.isListening
                ? labels.listening
                : labels.voiceAria
          }
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
            voice.isListening
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
            !voice.isSupported && "opacity-40"
          )}
        >
          {voice.isListening ? (
            <MicOff className="h-4 w-4" aria-hidden />
          ) : (
            <Mic className="h-4 w-4" aria-hidden />
          )}
        </button>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={labels.placeholder}
          disabled={disabled}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-siam-blue focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label={labels.send}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-siam-blue text-white transition hover:bg-siam-blue-light disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
