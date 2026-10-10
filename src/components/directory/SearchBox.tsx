"use client";

import { useRef } from "react";

export function SearchBox({
  name = "q",
  defaultValue,
  placeholder,
  label,
}: {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <input
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={label}
      autoComplete="off"
      className="h-12 w-full rounded-xl border border-border bg-white px-4 text-base shadow-sm outline-none ring-siam-blue focus:ring-2 dark:bg-slate-950"
      onChange={(event) => {
        const form = event.currentTarget.form;
        if (!form) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => form.requestSubmit(), 300);
      }}
    />
  );
}
