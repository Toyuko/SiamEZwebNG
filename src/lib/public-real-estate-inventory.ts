/** Allowed page sizes for the public /real-estate inventory. */
export const PUBLIC_REAL_ESTATE_PAGE_SIZES = [6, 9, 12, 18, 24] as const;

export const DEFAULT_PUBLIC_REAL_ESTATE_PAGE_SIZE = 9;

export function resolvePublicRealEstatePageSize(value: number | undefined): number {
  if (value === undefined) return DEFAULT_PUBLIC_REAL_ESTATE_PAGE_SIZE;
  return (PUBLIC_REAL_ESTATE_PAGE_SIZES as readonly number[]).includes(value)
    ? value
    : DEFAULT_PUBLIC_REAL_ESTATE_PAGE_SIZE;
}

export function parsePublicRealEstatePageSizeParam(value: string | undefined): number {
  if (!value) return DEFAULT_PUBLIC_REAL_ESTATE_PAGE_SIZE;
  const parsed = Number.parseInt(value, 10);
  return resolvePublicRealEstatePageSize(Number.isFinite(parsed) ? parsed : undefined);
}
