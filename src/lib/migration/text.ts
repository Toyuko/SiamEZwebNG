/** Remove lone UTF-16 surrogates (Prisma Json rejects truncated emoji). */
export function stripUnpairedSurrogates(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/** Collapse whitespace and truncate without splitting surrogate pairs. */
export function truncate(text: string, max: number): string {
  const collapsed = stripUnpairedSurrogates(text.replace(/\s+/g, " ").trim());
  if (collapsed.length <= max) return collapsed;
  let end = Math.max(0, max - 1);
  // Do not split a high surrogate from its low pair.
  if (end > 0 && end < collapsed.length) {
    const prev = collapsed.charCodeAt(end - 1);
    if (prev >= 0xd800 && prev <= 0xdbff) end -= 1;
  }
  return stripUnpairedSurrogates(`${collapsed.slice(0, end).trimEnd()}…`);
}
