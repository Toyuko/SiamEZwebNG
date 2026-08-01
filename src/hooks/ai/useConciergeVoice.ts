"use client";

import { useCallback } from "react";
import {
  useVoiceRecognition,
  type UseVoiceRecognitionReturn,
  type VoiceRecognitionErrorCode,
} from "@/hooks/useVoiceRecognition";
import type { ConciergeLocale } from "@/lib/ai/types";

export type UseConciergeVoiceOptions = {
  locale: ConciergeLocale;
  onTranscript: (transcript: string) => void;
};

export type UseConciergeVoiceReturn = UseVoiceRecognitionReturn & {
  voiceLang: string;
  toggleListening: () => void;
};

function localeToVoiceLang(locale: ConciergeLocale): string {
  return locale === "th" ? "th-TH" : "en-US";
}

/**
 * Voice-ready wrapper around the shared Web Speech hook.
 * Keeps concierge UI decoupled from SpeechRecognition details.
 */
export function useConciergeVoice({
  locale,
  onTranscript,
}: UseConciergeVoiceOptions): UseConciergeVoiceReturn {
  const voiceLang = localeToVoiceLang(locale);
  const voice = useVoiceRecognition({
    lang: voiceLang,
    onTranscript,
  });

  const { isListening, stopListening, resetError, startListening } = voice;

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    resetError();
    startListening();
  }, [isListening, resetError, startListening, stopListening]);

  return {
    ...voice,
    voiceLang,
    toggleListening,
  };
}

export function mapVoiceErrorLabel(
  code: VoiceRecognitionErrorCode | null,
  labels: {
    unsupported: string;
    permissionDenied: string;
    noSpeech: string;
    error: string;
  }
): string | null {
  if (!code) return null;
  switch (code) {
    case "not-supported":
      return labels.unsupported;
    case "permission-denied":
      return labels.permissionDenied;
    case "no-speech":
      return labels.noSpeech;
    default:
      return labels.error;
  }
}
