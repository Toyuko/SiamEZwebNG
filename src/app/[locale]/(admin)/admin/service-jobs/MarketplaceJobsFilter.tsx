"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTransition, useState } from "react";

const MARKETPLACE_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "completed_awaiting_review", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
];

export function MarketplaceJobsFilter({
  searchDefault,
  statusDefault,
}: {
  searchDefault?: string;
  statusDefault?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchDefault ?? "");

  const buildUrl = (updates: { search?: string; status?: string; page?: string }) => {
    const p = new URLSearchParams();
    p.set("source", "freelancer");
    if (updates.search !== undefined) {
      if (updates.search) p.set("search", updates.search);
    } else if (searchDefault) {
      p.set("search", searchDefault);
    }
    if (updates.status !== undefined) {
      if (updates.status && updates.status !== "all") p.set("status", updates.status);
    } else if (statusDefault && statusDefault !== "all") {
      p.set("status", statusDefault);
    }
    if (updates.page) p.set("page", updates.page);
    return `${pathname}?${p.toString()}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => router.push(buildUrl({ search: search.trim(), page: "1" })));
  };

  const handleStatusChange = (v: string) => {
    startTransition(() => router.push(buildUrl({ status: v, page: "1" })));
  };

  const handleClear = () => {
    setSearch("");
    startTransition(() => router.push(`${pathname}?source=freelancer`));
  };

  const hasFilters =
    (searchDefault ?? "") !== "" || (statusDefault ?? "all") !== "all";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
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
      <Select
        value={statusDefault ?? "all"}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="w-44"
      >
        {MARKETPLACE_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={pending}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
