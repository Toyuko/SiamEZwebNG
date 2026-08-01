/** Streaming helpers — mock token stream for local/no-key mode; LLM can plug in later. */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Yields growing prefixes of `text` so the UI can render a streaming cursor.
 * Chunks by words for a natural feel without requiring a real SSE connection.
 */
export async function* mockTokenStream(
  text: string,
  options: { delayMs?: number; chunkSize?: number } = {}
): AsyncGenerator<string, void, unknown> {
  const delayMs = options.delayMs ?? 18;
  const chunkSize = options.chunkSize ?? 1;
  const parts = text.split(/(\s+)/).filter((p) => p.length > 0);

  let buffer = "";
  let sinceFlush = 0;

  for (const part of parts) {
    buffer += part;
    sinceFlush += 1;
    if (sinceFlush >= chunkSize) {
      yield buffer;
      sinceFlush = 0;
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  if (buffer) yield buffer;
}

/** Collect an async string stream into a final string. */
export async function collectStream(
  stream: AsyncIterable<string>
): Promise<string> {
  let last = "";
  for await (const chunk of stream) {
    last = chunk;
  }
  return last;
}
