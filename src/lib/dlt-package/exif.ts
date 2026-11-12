/** Read the JPEG orientation tag. Returns 1 when the file has no orientation flag. */
export function jpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return 1;
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return 1;
    if (marker === 0xe1) {
      const orientation = orientationFromExif(bytes.subarray(offset + 4, offset + 2 + length));
      if (orientation) return orientation;
    }
    offset += 2 + length;
  }
  return 1;
}

function orientationFromExif(segment: Uint8Array): number | null {
  if (segment.length < 14) return null;
  const header = String.fromCharCode(...segment.subarray(0, 4));
  if (header !== "Exif") return null;
  const tiff = 6;
  const little = segment[tiff] === 0x49 && segment[tiff + 1] === 0x49;
  const read16 = (position: number) =>
    little ? segment[position] + (segment[position + 1] << 8) : (segment[position] << 8) + segment[position + 1];
  const read32 = (position: number) =>
    little
      ? segment[position] + (segment[position + 1] << 8) + (segment[position + 2] << 16) + (segment[position + 3] << 24)
      : (segment[position] << 24) + (segment[position + 1] << 16) + (segment[position + 2] << 8) + segment[position + 3];
  if (read16(tiff + 2) !== 42) return null;
  let ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > segment.length) return null;
  const count = read16(ifd);
  ifd += 2;
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + index * 12;
    if (entry + 12 > segment.length) return null;
    if (read16(entry) !== 0x0112) continue;
    const value = read16(entry + 8);
    return value >= 1 && value <= 8 ? value : 1;
  }
  return null;
}

export function isReadableUpload(input: { mimeType: string; bytes: Uint8Array }): boolean {
  if (input.mimeType === "application/pdf") {
    return input.bytes.byteLength > 500 && input.bytes[0] === 0x25 && input.bytes[1] === 0x50;
  }
  if (input.mimeType === "image/jpeg" || input.mimeType === "image/png") {
    return input.bytes.byteLength >= 800;
  }
  return false;
}
