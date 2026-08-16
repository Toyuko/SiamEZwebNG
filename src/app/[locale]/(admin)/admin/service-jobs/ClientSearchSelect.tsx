"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Client = { id: string; name: string | null; email: string };

function clientLabel(c: Client) {
  return c.name ? `${c.name} (${c.email})` : c.email;
}

export function ClientSearchSelect({
  clients,
  id,
  name,
  required,
  className,
}: {
  clients: Client[];
  id?: string;
  name: string;
  required?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const selected = clients.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        (c.name?.toLowerCase().includes(q) ?? false) || c.email.toLowerCase().includes(q)
    );
  }, [clients, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={selectedId} />
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-950",
          !selected && "text-gray-500"
        )}
      >
        <span className="truncate">{selected ? clientLabel(selected) : "Select client"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </button>

      {open && (
        // In-flow panel (not absolute) so the scrollable modal does not clip the list.
        <div className="mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-700">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              aria-autocomplete="list"
              aria-controls={listId}
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label="Clients"
            className="max-h-56 overflow-y-auto overscroll-contain py-1"
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500">No clients found</li>
            ) : (
              filtered.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <li key={c.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-siam-blue/10 hover:text-siam-blue",
                        isSelected && "bg-siam-blue/10 text-siam-blue"
                      )}
                      onClick={() => {
                        setSelectedId(c.id);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{clientLabel(c)}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
