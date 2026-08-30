"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceLineForm } from "@/lib/invoices/line-items";
import { totalSatangFromForm } from "@/lib/invoices/line-items";

function formatThb(satang: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(satang / 100);
}

export function InvoiceLineItemsEditor({
  lines,
  onChange,
  disabled,
}: {
  lines: InvoiceLineForm[];
  onChange: (lines: InvoiceLineForm[]) => void;
  disabled?: boolean;
}) {
  const totalSatang = totalSatangFromForm(lines);

  function updateRow(index: number, patch: Partial<InvoiceLineForm>) {
    onChange(lines.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-900 dark:text-white">Line items</p>
      {lines.map((row, idx) => (
        <div
          key={idx}
          className="grid gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:grid-cols-12"
        >
          <div className="sm:col-span-5">
            <Label htmlFor={`line-d-${idx}`}>Description</Label>
            <Input
              id={`line-d-${idx}`}
              value={row.description}
              disabled={disabled}
              onChange={(e) => updateRow(idx, { description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`line-q-${idx}`}>Qty</Label>
            <Input
              id={`line-q-${idx}`}
              type="number"
              min={1}
              value={row.quantity}
              disabled={disabled}
              onChange={(e) => updateRow(idx, { quantity: e.target.value })}
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor={`line-u-${idx}`}>Unit (THB)</Label>
            <Input
              id={`line-u-${idx}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={row.unitThb}
              disabled={disabled}
              onChange={(e) => updateRow(idx, { unitThb: e.target.value })}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={disabled || lines.length <= 1}
              onClick={() => onChange(lines.filter((_, i) => i !== idx))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...lines, { description: "", quantity: "1", unitThb: "" }])}
      >
        Add line
      </Button>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Subtotal: {formatThb(totalSatang)}
      </p>
    </div>
  );
}
