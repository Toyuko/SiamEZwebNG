/** Format job amount (stored in minor units) for display. Safe for client bundles. */
export function formatJobAmount(amount: number, currency: string): string {
  const value = amount / 100;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
