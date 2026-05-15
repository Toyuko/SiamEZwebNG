"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTransition, useState } from "react";

export function FreelancerSearch({
  defaultValue,
  defaultVerification,
}: {
  defaultValue?: string;
  defaultVerification?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(defaultValue ?? "");
  const [verification, setVerification] = useState(defaultVerification ?? "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (verification) params.set("verification", verification);
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search by name or email..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-64"
      />
      <select
        value={verification}
        onChange={(e) => setVerification(e.target.value)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        <option value="">All verification</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
      </select>
      <Button type="submit" variant="outline" size="icon" disabled={pending}>
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
