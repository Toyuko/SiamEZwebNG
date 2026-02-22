// Shared event color definitions and lookup helper
export const EVENT_LABEL_COLORS: Record<string, string> = {
  blue: "bg-siam-blue/15 text-siam-blue border-siam-blue/30 hover:bg-siam-blue/25",
  red: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25",
  pink: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30 hover:bg-pink-500/25",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/25",
  // type fallbacks
  appointment: "bg-siam-blue/15 text-siam-blue border-siam-blue/30 hover:bg-siam-blue/25",
  deadline: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25",
  milestone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
};

export const EVENT_COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "red", label: "Red" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "purple", label: "Purple" },
  { value: "cyan", label: "Cyan" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
];

export function getEventColorClass(event: { color?: string | null; type?: string }): string {
  return (
    EVENT_LABEL_COLORS[event.color ?? ""] ??
    EVENT_LABEL_COLORS[event.type ?? ""] ??
    EVENT_LABEL_COLORS.appointment
  );
}
