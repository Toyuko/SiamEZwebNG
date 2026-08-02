/**
 * Platform 2.1 — light magic-byte sniffing for uploads (Phase 8).
 * Complements MIME/size checks; does not replace antivirus.
 */

export type SniffedKind = "jpeg" | "png" | "gif" | "webp" | "pdf" | "mp4" | "webm" | "unknown";

export function sniffMagicBytes(bytes: Uint8Array): SniffedKind {
  if (bytes.length < 4) return "unknown";

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  // PDF %PDF
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "pdf";
  }
  // MP4 / ISO BMFF — ....ftyp
  if (
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "mp4";
  }
  // WebM / EBML
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm";
  }

  return "unknown";
}

const IMAGE_KINDS: SniffedKind[] = ["jpeg", "png", "gif", "webp"];
const DOC_KINDS: SniffedKind[] = ["pdf", ...IMAGE_KINDS];
const MEDIA_KINDS: SniffedKind[] = [...IMAGE_KINDS, "mp4", "webm"];

export function isAllowedUploadKind(
  kind: SniffedKind,
  purpose: "image" | "document" | "media"
): boolean {
  if (purpose === "image") return IMAGE_KINDS.includes(kind);
  if (purpose === "document") return DOC_KINDS.includes(kind);
  return MEDIA_KINDS.includes(kind);
}

export async function sniffFileHead(file: File): Promise<SniffedKind> {
  const buf = await file.slice(0, 16).arrayBuffer();
  return sniffMagicBytes(new Uint8Array(buf));
}
