"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import {
  groupServicesByCategory,
  useServiceFuseSearch,
  type FuseSearchableService,
} from "@/hooks/useServiceFuseSearch";
import type { DisplayService } from "@/components/sections/ServicesGrid";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";

export interface ServiceCommandPaletteLabels {
  placeholder: string;
  empty: string;
  listening: string;
  voiceUnsupported: string;
  voicePermissionDenied: string;
  voiceNoSpeech: string;
  voiceError: string;
  voiceSearchAria: string;
  shortcutHint: string;
  navigateHint: string;
}

interface ServiceCommandPaletteProps {
  services: DisplayService[];
  query: string;
  onQueryChange: (query: string) => void;
  categoryLabels: Record<string, string>;
  labels: ServiceCommandPaletteLabels;
  voiceLang?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceCommandPalette({
  services,
  query,
  onQueryChange,
  categoryLabels,
  labels,
  voiceLang = "en-US",
  open,
  onOpenChange,
}: ServiceCommandPaletteProps) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState(query);

  useEffect(() => {
    if (open) setInternalQuery(query);
  }, [open, query]);

  const effectiveQuery = open ? internalQuery : query;
  const fuseResults = useServiceFuseSearch(services, effectiveQuery, categoryLabels);
  const grouped = useMemo(() => groupServicesByCategory(fuseResults), [fuseResults]);

  const syncQuery = useCallback(
    (value: string) => {
      setInternalQuery(value);
      onQueryChange(value);
    },
    [onQueryChange]
  );

  const voice = useVoiceRecognition({
    lang: voiceLang,
    onTranscript: (transcript) => syncQuery(transcript),
  });

  const handleSelect = (service: FuseSearchableService) => {
    onOpenChange(false);
    router.push(`/services/${service.slug}`);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const emptyMessage = labels.empty.replace("{query}", effectiveQuery.trim() || "…");
  const showEmpty = effectiveQuery.trim().length > 0 && grouped.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] sm:p-6">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
      />
      <Command
        className="relative z-[101] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 shadow-2xl dark:border-gray-700"
        label="Search services"
        shouldFilter={false}
        loop
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:border-0">
          <CommandInput
            placeholder={labels.placeholder}
            value={internalQuery}
            onValueChange={syncQuery}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              if (voice.isListening) voice.stopListening();
              else {
                voice.resetError();
                voice.startListening();
              }
            }}
            disabled={!voice.isSupported}
            aria-label={voice.isListening ? labels.listening : labels.voiceSearchAria}
            aria-pressed={voice.isListening}
            title={
              !voice.isSupported
                ? labels.voiceUnsupported
                : voice.isListening
                  ? labels.listening
                  : labels.voiceSearchAria
            }
            className={cn(
              "mr-3 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue",
              voice.isListening
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-siam-blue dark:hover:bg-gray-800"
            )}
          >
            {voice.isListening ? (
              <>
                <MicOff className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{labels.listening}</span>
              </>
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        <CommandList>
          {showEmpty ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : (
            <>
              {!effectiveQuery.trim() && (
                <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {labels.shortcutHint} · {labels.navigateHint}
                </p>
              )}
              {grouped.map(({ category, items }) => (
                <CommandGroup key={category} heading={category}>
                  {items.map((service) => (
                    <CommandItem
                      key={service.slug}
                      value={`${service.slug}-${service.name}`}
                      onSelect={() => handleSelect(service)}
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {service.name}
                      </span>
                      {(service.shortDescription || service.description) && (
                        <span className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                          {service.shortDescription ??
                            (service.description && service.description.slice(0, 120))}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>

        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-[10px] text-gray-400 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-300 bg-gray-50 px-1 font-mono dark:border-gray-600 dark:bg-gray-800">
              ↑↓
            </kbd>
            {labels.navigateHint}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-300 bg-gray-50 px-1 font-mono dark:border-gray-600 dark:bg-gray-800">
              esc
            </kbd>
            close
          </span>
        </div>
      </Command>
    </div>
  );
}
