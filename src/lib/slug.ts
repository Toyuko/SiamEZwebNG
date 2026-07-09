/** URL-safe slug from a display name (lowercase, hyphenated). */
export function toSlug(input: string, maxLength = 80): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}
