"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AdminSearchGroup } from "@/lib/admin/search";

export function AdminSearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<AdminSearchGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const listId = useId();
  const router = useRouter();

  const flatItems = groups.flatMap((g) => g.items);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setGroups([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setGroups([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      void (async () => {
        try {
          const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          if (!res.ok) return;
          const data = (await res.json()) as { groups?: AdminSearchGroup[] };
          if (requestId !== requestIdRef.current) return;
          startTransition(() => {
            setGroups(data.groups ?? []);
            setActiveIndex(0);
          });
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.error(error);
          }
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      })();
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query]);

  const goTo = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-[#DCE6F5] bg-siam-admin-bg px-3 py-2 text-left text-sm text-siam-ink-muted transition-colors duration-premium hover:border-siam-blue/30 md:flex lg:max-w-md"
        aria-label="Search admin"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Search cases, clients, invoices…</span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border border-[#DCE6F5] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-siam-ink-muted sm:inline">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE6F5] text-siam-ink md:hidden"
        aria-label="Search admin"
      >
        <Search className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-siam-navy/40 p-4 pt-[12vh] backdrop-blur-[2px]">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close search" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin search"
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[#DCE6F5] bg-white shadow-card"
          >
            <div className="flex items-center gap-2 border-b border-[#DCE6F5] px-4">
              <Search className="h-4 w-4 text-siam-ink-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cases, clients, invoices, companies…"
                className="h-12 w-full bg-transparent text-sm text-siam-ink outline-none placeholder:text-siam-ink-muted"
                aria-controls={listId}
                aria-autocomplete="list"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && flatItems[activeIndex]) {
                    e.preventDefault();
                    goTo(flatItems[activeIndex].href);
                  }
                }}
              />
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-siam-ink-muted hover:bg-siam-surface"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id={listId} className="max-h-[50vh] overflow-y-auto p-2">
              {loading && query.trim().length >= 2 ? (
                <p className="px-3 py-6 text-center text-sm text-siam-ink-muted">Searching…</p>
              ) : null}
              {!loading && query.trim().length >= 2 && flatItems.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-siam-ink-muted">No results found.</p>
              ) : null}
              {query.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-sm text-siam-ink-muted">
                  Type at least 2 characters to search.
                </p>
              ) : null}

              {groups.map((group) => (
                <div key={group.id} className="mb-2">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-siam-ink-muted">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map((item) => {
                      const index = flatItems.findIndex((f) => f.id === item.id && f.href === item.href);
                      const active = index === activeIndex;
                      return (
                        <li key={`${group.id}-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => goTo(item.href)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                              "flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors",
                              active ? "bg-siam-blue text-white" : "hover:bg-siam-surface"
                            )}
                          >
                            <span className="text-sm font-semibold">{item.title}</span>
                            {item.subtitle ? (
                              <span className={cn("text-xs", active ? "text-white/80" : "text-siam-ink-muted")}>
                                {item.subtitle}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
