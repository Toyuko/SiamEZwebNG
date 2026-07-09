"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CompanySearch({
  defaultValue,
  defaultVerified,
}: {
  defaultValue?: string;
  defaultVerified?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const search = String(fd.get("search") ?? "").trim();
        const verified = String(fd.get("verified") ?? "");
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (verified) params.set("verified", verified);
        const qs = params.toString();
        startTransition(() => {
          router.push(`/admin/companies${qs ? `?${qs}` : ""}`);
        });
      }}
    >
      <div className="min-w-[200px] flex-1">
        <Input
          name="search"
          placeholder="Search name, email, slug…"
          defaultValue={defaultValue}
        />
      </div>
      <select
        name="verified"
        defaultValue={defaultVerified ?? ""}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">All verification</option>
        <option value="true">Verified</option>
        <option value="false">Unverified</option>
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
