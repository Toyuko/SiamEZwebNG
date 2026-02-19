"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@prisma/client";
import { updateService } from "@/actions/admin";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatCurrency(cents: number | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(cents / 100);
}

export function ServiceTable({ services }: { services: Service[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handlePriceChange = (id: string, value: string) => {
    const num = value === "" ? null : Math.round(parseFloat(value) * 100);
    startTransition(async () => {
      await updateService(id, { priceAmount: num });
      router.refresh();
    });
  };

  const handleTypeChange = (id: string, type: "fixed" | "quote") => {
    startTransition(async () => {
      await updateService(id, { type });
      router.refresh();
    });
  };

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No services in database.</p>
        <p className="mt-2 text-sm text-gray-400">Run: npm run db:seed</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Price (THB)</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              onPriceChange={(v) => handlePriceChange(s.id, v)}
              onTypeChange={(t) => handleTypeChange(s.id, t)}
              disabled={pending}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServiceRow({
  service,
  onPriceChange,
  onTypeChange,
  disabled,
}: {
  service: Service;
  onPriceChange: (v: string) => void;
  onTypeChange: (t: "fixed" | "quote") => void;
  disabled: boolean;
}) {
  const [localPrice, setLocalPrice] = React.useState(
    service.priceAmount != null ? String(service.priceAmount / 100) : ""
  );

  return (
    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50">
      <td className="px-4 py-3">
        <span className="font-medium">{service.name}</span>
        <span className="ml-2 text-gray-500">/{service.slug}</span>
      </td>
      <td className="px-4 py-3">
        <Select
          defaultValue={service.type}
          onChange={(e) => onTypeChange(e.target.value as "fixed" | "quote")}
          disabled={disabled}
          className="w-32"
        >
          <option value="fixed">Fixed</option>
          <option value="quote">Quote</option>
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="—"
            value={localPrice}
            onChange={(e) => setLocalPrice(e.target.value)}
            onBlur={() => onPriceChange(localPrice)}
            disabled={disabled}
            className="w-24"
          />
          <span className="text-xs text-gray-500">THB</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onPriceChange(localPrice)}
        >
          Save
        </Button>
      </td>
    </tr>
  );
}
