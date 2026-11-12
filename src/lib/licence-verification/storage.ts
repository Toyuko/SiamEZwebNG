import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

export type StoredLicenceFile = {
  storageKey: string;
  /** Public blob URLs stay server-side. The installed Blob SDK cannot create private objects. */
  exposure: "server-only-public-blob" | "local" | "unconfigured";
};

const LOCAL_ROOT = path.join(process.cwd(), "data", "licence-verification");
const LOCAL_PREFIX = "local:";

function safeName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return clean || "document";
}

function localKey(relativePath: string): string {
  return `${LOCAL_PREFIX}${relativePath}`;
}

async function storeLocally(relativePath: string, bytes: Buffer): Promise<StoredLicenceFile> {
  const absolute = path.resolve(LOCAL_ROOT, relativePath);
  if (!absolute.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error("Document path is not allowed.");
  }
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return { storageKey: localKey(relativePath), exposure: "local" };
}

/**
 * Store a licence file.
 * @vercel/blob 2.2.0 only allows access:"public". The URL is never returned to the browser.
 * Downloads go through the authenticated document route.
 * Outside production, a missing or rejected Blob token falls back to a private local folder.
 */
export async function storeLicenceFile(input: {
  applicationId: string;
  fileName: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<StoredLicenceFile> {
  const relativePath = path.join(input.applicationId, `${Date.now()}-${safeName(input.fileName)}`);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const forceLocal = process.env.LICENCE_STORAGE === "local";
  if (forceLocal || !token) {
    if (process.env.NODE_ENV === "production" && !forceLocal) {
      return { storageKey: `unconfigured://${relativePath}`, exposure: "unconfigured" };
    }
    if (process.env.NODE_ENV === "production" && forceLocal) {
      return storeLocally(relativePath, input.bytes);
    }
    if (!token || forceLocal) return storeLocally(relativePath, input.bytes);
  }
  try {
    const blob = await put(`licence-verification/${relativePath}`, input.bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType: input.mimeType,
      token,
    });
    return { storageKey: blob.url, exposure: "server-only-public-blob" };
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.error("[licence-verification] Blob upload failed; storing the file locally.", error);
    return storeLocally(relativePath, input.bytes);
  }
}

export async function readLicenceFile(storageKey: string): Promise<Buffer | null> {
  if (!storageKey || storageKey.startsWith("unconfigured://") || storageKey.startsWith("mock://")) {
    return null;
  }
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    const relativePath = storageKey.slice(LOCAL_PREFIX.length);
    const absolute = path.resolve(LOCAL_ROOT, relativePath);
    if (!absolute.startsWith(LOCAL_ROOT + path.sep)) return null;
    try {
      return await readFile(absolute);
    } catch {
      return null;
    }
  }
  const response = await fetch(storageKey);
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}
