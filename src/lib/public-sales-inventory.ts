/** Allowed page sizes for the public /sales inventory (matches grid-friendly counts; max 24). */
export const PUBLIC_SALES_PAGE_SIZES = [6, 9, 12, 18, 24] as const;

export const DEFAULT_PUBLIC_SALES_PAGE_SIZE = 9;

export function resolvePublicSalesPageSize(value: number | undefined): number {
  if (value === undefined) return DEFAULT_PUBLIC_SALES_PAGE_SIZE;
  return (PUBLIC_SALES_PAGE_SIZES as readonly number[]).includes(value) ? value : DEFAULT_PUBLIC_SALES_PAGE_SIZE;
}

export function parsePublicSalesPageSizeParam(value: string | undefined): number {
  if (!value) return DEFAULT_PUBLIC_SALES_PAGE_SIZE;
  const parsed = Number.parseInt(value, 10);
  return resolvePublicSalesPageSize(Number.isFinite(parsed) ? parsed : undefined);
}
