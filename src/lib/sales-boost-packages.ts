/** Boost SKUs: tier id, THB price, calendar days. */
export const SALES_BOOST_PACKAGES = [
  { id: "1w" as const, priceThb: 1500, days: 7 },
  { id: "2w" as const, priceThb: 2500, days: 14 },
  { id: "4w" as const, priceThb: 5000, days: 28 },
] as const;

export type SalesBoostPackageId = (typeof SALES_BOOST_PACKAGES)[number]["id"];

export function getSalesBoostPackage(id: string) {
  return SALES_BOOST_PACKAGES.find((p) => p.id === id);
}

export function boostDaysFromTier(tier: string | null | undefined): number {
  return getSalesBoostPackage(tier ?? "")?.days ?? 7;
}
