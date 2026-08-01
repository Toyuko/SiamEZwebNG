"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useUnifiedFuseSearch } from "@/hooks/useUnifiedFuseSearch";
import { getUnifiedSearchIndexAction } from "@/actions/unified-search";
import type { SearchDocument } from "@/lib/search";
import { cn } from "@/lib/utils";
import { Building2, Car, HelpCircle, Loader2, Search, Wrench } from "lucide-react";

export interface UnifiedSearchPaletteLabels {
  placeholder: string;
  empty: string;
  loading: string;
  shortcutHint: string;
  navigateHint: string;
  groupServices: string;
  groupVehicles: string;
  groupProperties: string;
  groupHelp: string;
  close: string;
}

interface UnifiedSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale?: "en" | "th";
  labels: UnifiedSearchPaletteLabels;
  /** Optional preloaded index (skips server fetch). */
  documents?: SearchDocument[];
}

function DivisionIcon({ division }: { division: SearchDocument["division"] }) {
  const className = "h-4 w-4 shrink-0 text-gray-400";
  switch (division) {
    case "service":
      return <Wrench className={className} aria-hidden />;
    case "vehicle":
      return <Car className={className} aria-hidden />;
    case "property":
      return <Building2 className={className} aria-hidden />;
    case "help":
      return <HelpCircle className={className} aria-hidden />;
    default:
      return null;
  }
}

export function UnifiedSearchPalette({
  open,
  onOpenChange,
  locale = "en",
  labels,
  documents: documentsProp,
}: UnifiedSearchPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<SearchDocument[]>(documentsProp ?? []);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(Boolean(documentsProp?.length));

  useEffect(() => {
    if (documentsProp) {
      setDocuments(documentsProp);
      setLoaded(true);
    }
  }, [documentsProp]);

  useEffect(() => {
    if (!open || loaded || documentsProp) return;
    let cancelled = false;
    setLoading(true);
    getUnifiedSearchIndexAction(locale)
      .then((docs) => {
        if (!cancelled) {
          setDocuments(docs);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments([]);
          setLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded, locale, documentsProp]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const { groups, total } = useUnifiedFuseSearch(documents, query, 8);
  const trimmed = query.trim();
  const showEmpty = trimmed.length > 0 && total === 0 && !loading;

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

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

  const emptyMessage = labels.empty.replace("{query}", trimmed || "…");

  const renderItems = (items: SearchDocument[]) =>
    items.map((doc) => (
      <CommandItem
        key={doc.id}
        value={`${doc.id}-${doc.title}`}
        onSelect={() => handleSelect(doc.href)}
      >
        <DivisionIcon division={doc.division} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-gray-900 dark:text-gray-100">{doc.title}</span>
          {doc.subtitle ? (
            <span className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
              {doc.subtitle}
            </span>
          ) : null}
        </span>
      </CommandItem>
    ));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] sm:p-6">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={labels.close}
        onClick={() => onOpenChange(false)}
      />
      <Command
        className="relative z-[101] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 shadow-2xl dark:border-gray-700"
        label="Unified search"
        shouldFilter={false}
        loop
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:border-0">
          <CommandInput
            placeholder={labels.placeholder}
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          {loading ? (
            <Loader2
              className="mr-3 h-4 w-4 shrink-0 animate-spin text-gray-400"
              aria-label={labels.loading}
            />
          ) : null}
        </div>

        <CommandList>
          {showEmpty ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : (
            <>
              {!trimmed && (
                <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {labels.shortcutHint} · {labels.navigateHint}
                </p>
              )}
              {groups.services.length > 0 && (
                <CommandGroup heading={labels.groupServices}>
                  {renderItems(groups.services)}
                </CommandGroup>
              )}
              {groups.vehicles.length > 0 && (
                <CommandGroup heading={labels.groupVehicles}>
                  {renderItems(groups.vehicles)}
                </CommandGroup>
              )}
              {groups.properties.length > 0 && (
                <CommandGroup heading={labels.groupProperties}>
                  {renderItems(groups.properties)}
                </CommandGroup>
              )}
              {groups.help.length > 0 && (
                <CommandGroup heading={labels.groupHelp}>{renderItems(groups.help)}</CommandGroup>
              )}
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
            {labels.close}
          </span>
        </div>
      </Command>
    </div>
  );
}

/** Compact header trigger that owns palette open state + i18n labels. */
export function UnifiedSearchTrigger({
  labels,
  locale = "en",
  className,
}: {
  labels: UnifiedSearchPaletteLabels & { openAria: string };
  locale?: "en" | "th";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.openAria}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-siam-blue/40 hover:text-siam-blue",
          className
        )}
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden lg:inline">⌘K</span>
      </button>
      <UnifiedSearchPalette
        open={open}
        onOpenChange={setOpen}
        locale={locale}
        labels={labels}
      />
    </>
  );
}
