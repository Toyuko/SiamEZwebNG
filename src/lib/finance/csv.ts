/** Minimal CSV helpers for financial report exports. */

export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\n") + "\n";
}

/** Satang → baht string for CSV (2 decimals). */
export function satangToCsvBaht(satang: number): string {
  return (satang / 100).toFixed(2);
}
