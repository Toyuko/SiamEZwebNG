"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AddPaymentModal } from "./AddPaymentModal";
import type { InvoiceForManualPayment } from "@/actions/admin";

const METHOD_OPTIONS = [
  { value: "all", label: "All Methods" },
  { value: "manual", label: "Manual" },
  { value: "qr", label: "QR" },
  { value: "bank", label: "Bank" },
  { value: "wise", label: "Wise" },
  { value: "stripe", label: "Stripe" },
];

function buildHref(pathname: string, params: URLSearchParams) {
  const s = params.toString();
  return s ? `${pathname}?${s}` : pathname;
}

export function PaymentsToolbar({
  defaultQ,
  defaultMethod,
  defaultTab,
  invoices,
}: {
  defaultQ?: string;
  defaultMethod?: string;
  defaultTab?: string;
  invoices: InvoiceForManualPayment[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const pushFilters = useCallback(
    (next: { q?: string; method?: string }) => {
      const p = new URLSearchParams();
      const tab = defaultTab && defaultTab !== "all" ? defaultTab : "";
      if (tab) p.set("tab", tab);
      const q = next.q !== undefined ? next.q : defaultQ ?? "";
      const method = next.method !== undefined ? next.method : defaultMethod ?? "all";
      if (q.trim()) p.set("q", q.trim());
      if (method && method !== "all") p.set("method", method);
      router.push(buildHref(pathname, p));
    },
    [router, pathname, defaultTab, defaultQ, defaultMethod]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <AddPaymentModal invoices={invoices} />
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            pushFilters({ q: String(fd.get("q") ?? "") });
          }}
        >
          <Input
            name="q"
            type="search"
            placeholder="Search by order number"
            defaultValue={defaultQ ?? ""}
            className="flex-1"
          />
          <Button type="submit" variant="outline" className="shrink-0">
            Search
          </Button>
        </form>
        <Select
          id="payment-method-filter"
          defaultValue={defaultMethod ?? "all"}
          className="w-full sm:w-44"
          onChange={(e) => pushFilters({ method: e.target.value })}
        >
          {METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
