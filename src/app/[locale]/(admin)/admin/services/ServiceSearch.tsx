"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTransition, useState } from "react";

export function ServiceSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(defaultValue ?? "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`${pathname}${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ""}`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <Input
        placeholder="Search services..."
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
