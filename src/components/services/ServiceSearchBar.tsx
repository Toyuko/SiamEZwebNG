"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Search } from "lucide-react";

export interface ServiceSearchBarLabels {
  searchButton: string;
  listening: string;
  voiceUnsupported: string;
  voicePermissionDenied: string;
  voiceNoSpeech: string;
  voiceError: string;
  voiceSearchAria: string;
}

interface ServiceSearchBarProps {
  placeholder: string;
  searchButtonText: string;
  value: string;
  onChange: (value: string) => void;
  onOpenPalette?: () => void;
  onSubmit?: () => void;
  voiceLang?: string;
  labels: ServiceSearchBarLabels;
  className?: string;
}

export function ServiceSearchBar({
  placeholder,
  searchButtonText,
  value,
  onChange,
  onOpenPalette,
  onSubmit,
  voiceLang = "en-US",
  labels,
  className,
}: ServiceSearchBarProps) {
  const handleTranscript = useCallback(
    (transcript: string) => {
      onChange(transcript);
      onOpenPalette?.();
    },
    [onChange, onOpenPalette]
  );

  const voice = useVoiceRecognition({
    lang: voiceLang,
    onTranscript: handleTranscript,
  });

  const handleVoiceClick = () => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    voice.resetError();
    voice.startListening();
  };

  const voiceTitle =
    !voice.isSupported
      ? labels.voiceUnsupported
      : voice.error === "permission-denied"
        ? labels.voicePermissionDenied
        : voice.error === "no-speech"
          ? labels.voiceNoSpeech
          : voice.error
            ? labels.voiceError
            : labels.voiceSearchAria;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit?.();
      const section = document.getElementById("services-section");
      section?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("mx-auto max-w-2xl", className)}>
      <div className="flex gap-0 rounded-2xl bg-white p-1.5 shadow-xl dark:bg-gray-900">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
          <Input
            type="search"
            role="combobox"
            aria-expanded={false}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={onOpenPalette}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={handleVoiceClick}
            disabled={!voice.isSupported}
            title={voiceTitle}
            aria-label={voice.isListening ? labels.listening : labels.voiceSearchAria}
            aria-pressed={voice.isListening}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2",
              voice.isListening
                ? "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-siam-blue dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-siam-blue-bright",
              !voice.isSupported && "cursor-not-allowed opacity-40"
            )}
          >
            {voice.isListening ? (
              <>
                <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-red-400/40" />
                <MicOff className="relative h-5 w-5" aria-hidden />
                <span className="relative hidden sm:inline">{labels.listening}</span>
              </>
            ) : (
              <Mic className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        <Button
          type="submit"
          className="shrink-0 rounded-xl bg-siam-blue px-4 py-3 text-base font-medium text-white hover:bg-siam-blue-light focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 sm:px-6"
        >
          {searchButtonText}
        </Button>
      </div>
      {voice.error && voice.errorMessage && (
        <p className="mt-2 text-center text-sm text-red-200/90" role="status">
          {voice.error === "permission-denied"
            ? labels.voicePermissionDenied
            : voice.error === "no-speech"
              ? labels.voiceNoSpeech
              : voice.error === "not-supported"
                ? labels.voiceUnsupported
                : labels.voiceError}
        </p>
      )}
    </form>
  );
}
