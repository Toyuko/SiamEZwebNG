"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2, Lock, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BookingWidgetService = {
  slug: string;
  name: string;
};

type HeroBookingWidgetProps = {
  title: string;
  subtitle: string;
  selectLabel: string;
  selectPlaceholder: string;
  continueLabel: string;
  steps: [string, string, string];
  trustLabels: [string, string, string];
  services: BookingWidgetService[];
  className?: string;
};

export function HeroBookingWidget({
  title,
  subtitle,
  selectLabel,
  selectPlaceholder,
  continueLabel,
  steps,
  trustLabels,
  services,
  className,
}: HeroBookingWidgetProps) {
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const options = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  );

  const onContinue = () => {
    const selected = selectRef.current?.value || slug;
    if (!selected) {
      setError(true);
      return;
    }
    setSlug(selected);
    setError(false);
    startTransition(() => {
      router.push(`/book/${selected}`);
    });
  };

  return (
    <div
      className={cn(
        "rounded-siam-xl border border-white/20 bg-white p-5 shadow-card sm:p-6",
        className
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-siam-ink sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm text-siam-ink-muted">{subtitle}</p>
      </div>

      <ol className="mb-5 flex items-center gap-2" aria-label="Booking steps">
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                index === 0
                  ? "bg-siam-blue text-white"
                  : "bg-siam-surface text-siam-ink-muted"
              )}
            >
              {index + 1}
            </span>
            <span className="text-[11px] font-medium text-siam-ink-muted sm:text-xs">
              {label}
            </span>
          </li>
        ))}
      </ol>

      <label className="mb-1.5 block text-sm font-semibold text-siam-ink" htmlFor="hero-book-service">
        {selectLabel}
      </label>
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-siam-ink-muted"
          aria-hidden
        />
        <select
          id="hero-book-service"
          ref={selectRef}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setError(false);
          }}
          className={cn(
            "h-12 w-full appearance-none rounded-siam-md border bg-siam-surface/60 pl-10 pr-8 text-sm text-siam-ink outline-none transition-colors focus:border-siam-blue focus:ring-2 focus:ring-siam-blue/20",
            error ? "border-red-500" : "border-siam-surface-pale"
          )}
          aria-invalid={error}
        >
          <option value="">{selectPlaceholder}</option>
          {options.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onContinue}
        disabled={pending}
      >
        {continueLabel}
      </Button>

      <ul className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-siam-ink-muted sm:text-xs">
        <li className="inline-flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-siam-yellow-dark" aria-hidden />
          {trustLabels[0]}
        </li>
        <li className="inline-flex items-center gap-1">
          <Lock className="h-3.5 w-3.5 text-siam-blue" aria-hidden />
          {trustLabels[1]}
        </li>
        <li className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden />
          {trustLabels[2]}
        </li>
      </ul>
    </div>
  );
}
