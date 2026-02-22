"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Service } from "@prisma/client";
import { updateService, deleteService } from "@/actions/admin";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export function ServiceTable({ services, onEdit }: { services: Service[]; onEdit?: (service: Service) => void }) {
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

  const handleActiveChange = (id: string, active: boolean) => {
    startTransition(async () => {
      await updateService(id, { active });
      router.refresh();
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete service "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteService(id);
      router.refresh();
    });
  };

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No services found.</p>
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
            <th className="px-4 py-3 font-medium">Active</th>
            <th className="px-4 py-3 font-medium w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              onPriceChange={(v) => handlePriceChange(s.id, v)}
              onTypeChange={(t) => handleTypeChange(s.id, t)}
              onActiveChange={(a) => handleActiveChange(s.id, a)}
              onDelete={() => handleDelete(s.id, s.name)}
              onEdit={onEdit}
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
  onActiveChange,
  onDelete,
  onEdit,
  disabled,
}: {
  service: Service;
  onPriceChange: (v: string) => void;
  onTypeChange: (t: "fixed" | "quote") => void;
  onActiveChange: (active: boolean) => void;
  onDelete: () => void;
  onEdit?: (service: Service) => void;
  disabled: boolean;
}) {
  const [localPrice, setLocalPrice] = React.useState(
    service.priceAmount != null ? String(service.priceAmount / 100) : ""
  );

  return (
    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50">
      <td className="px-4 py-3">
        {onEdit ? (
          <button type="button" onClick={() => onEdit(service)} className="font-medium text-siam-blue hover:underline text-left">
            {service.name}
          </button>
        ) : (
          <Link href={`/admin/services/${service.id}/edit`} className="font-medium text-siam-blue hover:underline">
            {service.name}
          </Link>
        )}
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
        <Select
          defaultValue={service.active ? "1" : "0"}
          onChange={(e) => onActiveChange(e.target.value === "1")}
          disabled={disabled}
          className="w-24"
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {onEdit ? (
            <Button variant="ghost" size="icon" onClick={() => onEdit(service)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/services/${service.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
