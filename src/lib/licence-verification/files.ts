export const DEFAULT_MAX_UPLOAD_BYTES = 4_000_000;

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function maxUploadBytes(): number {
  const raw = Number(process.env.LICENCE_UPLOAD_MAX_BYTES);
  if (Number.isFinite(raw) && raw >= 100_000 && raw <= 15_000_000) return raw;
  return DEFAULT_MAX_UPLOAD_BYTES;
}

export type FileCheck =
  | { ok: true; mimeType: "application/pdf" | "image/jpeg" | "image/png" }
  | { ok: false; error: string };

export function detectMime(bytes: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

export function validateUpload(input: { bytes: Uint8Array; declaredType?: string | null; size: number }): FileCheck {
  if (input.size <= 0 || input.bytes.byteLength <= 0) {
    return { ok: false, error: "The file is empty." };
  }
  if (input.size > maxUploadBytes()) {
    return {
      ok: false,
      error: `File is too large. The limit is ${Math.floor(maxUploadBytes() / 1_000_000)} MB.`,
    };
  }
  const mime = detectMime(input.bytes);
  if (!mime || !ALLOWED.has(mime)) {
    return { ok: false, error: "Upload a PDF, JPG, or PNG file." };
  }
  if (input.declaredType && ALLOWED.has(input.declaredType) && input.declaredType !== mime) {
    if (!(input.declaredType === "image/jpeg" && mime === "image/jpeg")) {
      return { ok: false, error: "The file contents do not match its type." };
    }
  }
  return { ok: true, mimeType: mime };
}
