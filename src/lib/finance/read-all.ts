/**
 * Reads every matching row. A short page ends the read. A failed page or a
 * stuck cursor is reported as incomplete instead of being treated as the full set.
 */

export type PageRead<T> = {
  rows: T[];
  complete: boolean;
  batches: number;
  note: string | null;
};

export async function readEveryPage<T extends { id: string }>(
  load: (cursor: string | null, take: number) => Promise<T[]>,
  take = 400,
  maxBatches = 5000
): Promise<PageRead<T>> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let batches = 0;
  while (batches < maxBatches) {
    let page: T[];
    try {
      page = await load(cursor, take);
    } catch {
      return { rows, complete: false, batches, note: "A database page failed, so this result is incomplete." };
    }
    batches += 1;
    if (page.length === 0) return { rows, complete: true, batches, note: null };
    const last = page[page.length - 1];
    if (!last?.id || last.id === cursor) {
      return { rows, complete: false, batches, note: "The database page did not advance, so this result is incomplete." };
    }
    for (const row of page) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    if (page.length < take) return { rows, complete: true, batches, note: null };
    cursor = last.id;
  }
  return {
    rows,
    complete: false,
    batches,
    note: "The read stopped before every matching record was retrieved, so this result is incomplete.",
  };
}
