"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTransition, useState } from "react";

export function DocumentFilter({
  defaultCaseId,
  defaultType,
  defaultSearch,
}: {
  defaultCaseId?: string;
  defaultType?: string;
  defaultSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(defaultSearch ?? "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const p = new URLSearchParams();
      if (defaultCaseId) p.set("caseId", defaultCaseId);
      if (defaultType) p.set("documentType", defaultType);
      if (q.trim()) p.set("search", q.trim());
      router.push(`${pathname}${p.toString() ? `?${p}` : ""}`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <Input
        placeholder="Search by document name..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-64"
      />
      <Button type="submit" variant="outline" size="icon" disabled={pending}>
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
