/** Privacy-safe freelancer label: first name + last initial (e.g. "Somchai P."). */
export function formatFreelancerDisplayName(name: string | null | undefined): string {
  if (!name?.trim()) return "Your coordinator";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!;
  const first = parts[0]!;
  const lastInitial = parts[parts.length - 1]![0]?.toUpperCase() ?? "";
  return lastInitial ? `${first} ${lastInitial}.` : first;
}
