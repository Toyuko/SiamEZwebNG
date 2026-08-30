export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitAmountSatang: number;
  lineTotalSatang: number;
};

export type InvoiceLineForm = {
  description: string;
  quantity: string;
  unitThb: string;
};

export function thbToSatang(value: string): number {
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return -1;
  return Math.round(n * 100);
}

export function satangToThbInput(satang: number): string {
  return (satang / 100).toFixed(2);
}

export function parseInvoiceLineItems(raw: unknown): InvoiceLineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: InvoiceLineItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const description = String(rec.description ?? "").trim();
    const quantity = Math.max(1, Math.floor(Number(rec.quantity) || 1));
    const unitAmountSatang = Math.round(Number(rec.unitAmountSatang) || 0);
    const lineTotalSatang =
      Number.isFinite(Number(rec.lineTotalSatang)) && Number(rec.lineTotalSatang) >= 0
        ? Math.round(Number(rec.lineTotalSatang))
        : quantity * unitAmountSatang;
    if (!description && unitAmountSatang <= 0 && lineTotalSatang <= 0) continue;
    items.push({
      description: description || "Line item",
      quantity,
      unitAmountSatang,
      lineTotalSatang,
    });
  }
  return items;
}

export function lineItemsToForm(items: InvoiceLineItem[]): InvoiceLineForm[] {
  if (items.length === 0) {
    return [{ description: "", quantity: "1", unitThb: "" }];
  }
  return items.map((item) => ({
    description: item.description,
    quantity: String(item.quantity),
    unitThb: satangToThbInput(item.unitAmountSatang),
  }));
}

export function fallbackLineItemsFromAmount(amountSatang: number): InvoiceLineForm[] {
  return [
    {
      description: "Invoice total",
      quantity: "1",
      unitThb: amountSatang > 0 ? satangToThbInput(amountSatang) : "",
    },
  ];
}

export function formLinesToPayload(lines: InvoiceLineForm[]): InvoiceLineItem[] {
  return lines.map((row) => {
    const quantity = Math.max(1, Math.floor(Number(row.quantity) || 1));
    const unitAmountSatang = Math.max(0, thbToSatang(row.unitThb));
    return {
      description: row.description.trim(),
      quantity,
      unitAmountSatang,
      lineTotalSatang: quantity * unitAmountSatang,
    };
  });
}

export function totalSatangFromForm(lines: InvoiceLineForm[]): number {
  return formLinesToPayload(lines).reduce((sum, row) => sum + row.lineTotalSatang, 0);
}

export function areFormLinesValid(lines: InvoiceLineForm[]): boolean {
  if (lines.length === 0) return false;
  for (const row of lines) {
    if (!row.description.trim()) return false;
    const quantity = Math.floor(Number(row.quantity) || 0);
    if (quantity < 1) return false;
    if (thbToSatang(row.unitThb) < 0) return false;
  }
  return totalSatangFromForm(lines) > 0;
}
