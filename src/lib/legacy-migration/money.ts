/** Convert legacy THB amounts (number or "5000.00") to satang without recalculating history. */
export function thbToSatang(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function satangToThb(satang: number): number {
  return satang / 100;
}

export function sumThb(values: unknown[]): number {
  return satangToThb(values.reduce<number>((acc, v) => acc + thbToSatang(v), 0));
}

export function roundThb(value: number): number {
  return Math.round(value * 100) / 100;
}
