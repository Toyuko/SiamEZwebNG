"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTransition, useState } from "react";
import type { Service } from "@prisma/client";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "quoted", label: "Quoted" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_docs", label: "Pending docs" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ServiceJobsFilter({
  searchDefault,
  statusDefault,
  serviceIdDefault,
  dateFromDefault,
  dateToDefault,
  services,
}: {
  searchDefault?: string;
  statusDefault?: string;
  serviceIdDefault?: string;
  dateFromDefault?: string;
  dateToDefault?: string;
  services: Service[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchDefault ?? "");

  const buildUrl = (updates: {
    search?: string;
    status?: string;
    serviceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }) => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (updates.search !== undefined) {
      if (updates.search) p.set("search", updates.search);
      else p.delete("search");
    }
    if (updates.status !== undefined) {
      if (updates.status && updates.status !== "all") p.set("status", updates.status);
      else p.delete("status");
    }
    if (updates.serviceId !== undefined) {
      if (updates.serviceId) p.set("serviceId", updates.serviceId);
      else p.delete("serviceId");
    }
    if (updates.dateFrom !== undefined) {
      if (updates.dateFrom) p.set("dateFrom", updates.dateFrom);
      else p.delete("dateFrom");
    }
    if (updates.dateTo !== undefined) {
      if (updates.dateTo) p.set("dateTo", updates.dateTo);
      else p.delete("dateTo");
    }
    if (updates.page !== undefined) p.set("page", String(updates.page));
    else p.delete("page");
    return `${pathname}${p.toString() ? `?${p}` : ""}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => router.push(buildUrl({ search: search.trim(), page: "1" })));
  };

  const handleStatusChange = (v: string) => {
    startTransition(() => router.push(buildUrl({ status: v, page: "1" })));
  };

  const handleServiceChange = (v: string) => {
    startTransition(() => router.push(buildUrl({ serviceId: v || undefined, page: "1" })));
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => router.push(buildUrl({ dateFrom: val || undefined, page: "1" })));
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => router.push(buildUrl({ dateTo: val || undefined, page: "1" })));
  };

  const handleClearFilters = () => {
    setSearch("");
    startTransition(() => router.push(pathname));
  };

  const hasFilters =
    (searchDefault ?? "") !== "" ||
    (statusDefault ?? "all") !== "all" ||
    (serviceIdDefault ?? "") !== "" ||
    (dateFromDefault ?? "") !== "" ||
    (dateToDefault ?? "") !== "";

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search jobs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 sm:w-56"
          />
          <Button type="submit" variant="outline" size="icon" disabled={pending}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <Select
            id="status-filter"
            value={statusDefault ?? "all"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-36"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select
            id="service-filter"
            value={serviceIdDefault ?? ""}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-40"
          >
            <option value="">All Services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            placeholder="Date From"
            value={dateFromDefault ?? ""}
            onChange={handleDateFromChange}
            className="w-36"
          />
          <Input
            type="date"
            placeholder="Date To"
            value={dateToDefault ?? ""}
            onChange={handleDateToChange}
            className="w-36"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={pending}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
