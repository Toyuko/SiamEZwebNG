import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { requireStaff } from "@/lib/auth";

export const runtime = "nodejs";

const FILE = path.join(process.cwd(), "private/videos/licence-send-link-whatsapp-line.mp4");
const DOWNLOAD_NAME = "siamez-send-upload-link.mp4";

export async function GET(request: Request) {
  await requireStaff();
  const info = await stat(FILE);
  const size = info.size;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const disposition = download ? `attachment; filename="${DOWNLOAD_NAME}"` : "inline";
  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = createReadStream(FILE, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Disposition": disposition,
      },
    });
  }
  const stream = createReadStream(FILE);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Disposition": disposition,
    },
  });
}
