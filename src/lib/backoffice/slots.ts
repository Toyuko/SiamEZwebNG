export type BusyInterval = [number, number];

/** First 60-minute opening between 09:00 and 17:00. Minutes are from midnight. */
export function firstFreeSlot(busy: BusyInterval[]): string | null {
  const dayStart = 9 * 60;
  const dayEnd = 17 * 60;
  const clipped = busy
    .map(([start, end]): BusyInterval => [Math.max(dayStart, start), Math.min(dayEnd, end)])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  let cursor = dayStart;
  for (const [start, end] of clipped) {
    if (start - cursor >= 60) return formatMinutes(cursor);
    cursor = Math.max(cursor, end);
  }
  if (dayEnd - cursor >= 60) return formatMinutes(cursor);
  return null;
}

function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function bangkokMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
