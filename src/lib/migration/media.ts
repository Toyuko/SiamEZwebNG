/** Count media URLs stored as Prisma Json arrays without mutating source data. */

export function countUrlList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((entry) => typeof entry === "string" && entry.trim().length > 0).length;
}
