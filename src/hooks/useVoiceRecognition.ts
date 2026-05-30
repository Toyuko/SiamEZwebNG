"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecognitionStatus = "idle" | "listening" | "unsupported" | "error";

export type VoiceRecognitionErrorCode =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "aborted"
  | "network"
  | "unknown";

export interface UseVoiceRecognitionOptions {
  /** BCP 47 language tag (e.g. en-US, th-TH) */
  lang?: string;
  onTranscript?: (transcript: string) => void;
}

export interface UseVoiceRecognitionReturn {
  status: VoiceRecognitionStatus;
  isListening: boolean;
  error: VoiceRecognitionErrorCode | null;
  errorMessage: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetError: () => void;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapSpeechError(error: string): VoiceRecognitionErrorCode {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission-denied";
    case "no-speech":
      return "no-speech";
    case "aborted":
      return "aborted";
    case "network":
      return "network";
    default:
      return "unknown";
  }
}

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  const { lang = "en-US", onTranscript } = options;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [status, setStatus] = useState<VoiceRecognitionStatus>("idle");
  const [error, setError] = useState<VoiceRecognitionErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSupported = typeof window !== "undefined" && !!getSpeechRecognitionCtor();

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus((s) => (s === "listening" ? "idle" : s));
  }, []);

  const resetError = useCallback(() => {
    setError(null);
    setErrorMessage(null);
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      setError("not-supported");
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    resetError();
    stopListening();

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onTranscriptRef.current?.(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = mapSpeechError(event.error);
      setError(code);
      setErrorMessage(event.message || event.error);
      setStatus("error");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("unknown");
      setErrorMessage("Could not start voice recognition.");
      setStatus("error");
    }
  }, [lang, resetError, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return {
    status: isSupported ? status : "unsupported",
    isListening: status === "listening",
    error: isSupported ? error : "not-supported",
    errorMessage: isSupported ? errorMessage : "Speech recognition is not supported in this browser.",
    isSupported,
    startListening,
    stopListening,
    resetError,
  };
}
