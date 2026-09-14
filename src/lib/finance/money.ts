/**
 * Financial money helpers — amounts are satang (Int), matching Payment/Invoice.
 * Never use floating-point for money math.
 */

export type MoneySatang = number;

export function assertNonNegativeAmount(amount: number, label = "amount"): void {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error(`${label} must be a finite integer (satang)`);
  }
  if (amount < 0) {
    throw new Error(`${label} cannot be negative`);
  }
}

export function sumSatang(values: Iterable<MoneySatang>): MoneySatang {
  let total = 0;
  for (const v of values) {
    total += v;
  }
  return total;
}

/** Gross margin percent (0–100). Revenue 0 → 0. */
export function grossMarginPercent(revenue: MoneySatang, grossProfit: MoneySatang): number {
  if (revenue <= 0) return 0;
  return (grossProfit / revenue) * 100;
}

export function netMarginPercent(revenue: MoneySatang, netProfit: MoneySatang): number {
  if (revenue <= 0) return 0;
  return (netProfit / revenue) * 100;
}

export function roundMargin(pct: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(pct * f) / f;
}

/** Convert baht display input to satang. */
export function bahtToSatang(baht: number): MoneySatang {
  return Math.round(baht * 100);
}

export function satangToBaht(satang: MoneySatang): number {
  return satang / 100;
}
