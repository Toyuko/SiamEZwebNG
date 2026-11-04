import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type StoredProvider = {
  id: string;
  label: string;
  preset: string;
  baseUrl: string;
  model: string;
  sealedKey: string | null;
  enabled: boolean;
};

export type PublicProvider = {
  id: string;
  label: string;
  preset: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  hasKey: boolean;
};

function keyBytes(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sealSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openSecret(sealed: string, secret: string): string | null {
  const [iv, tag, data] = sealed.split(".");
  if (!iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(secret), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function assertProviderUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Use https, or http://127.0.0.1 for a model on this machine.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "https:") return url.toString();
  if (url.protocol === "http:" && local) return url.toString();
  throw new Error("Use https, or http://127.0.0.1 for a model on this machine.");
}

export function toPublicProvider(provider: StoredProvider): PublicProvider {
  return {
    id: provider.id,
    label: provider.label,
    preset: provider.preset,
    baseUrl: provider.baseUrl,
    model: provider.model,
    enabled: provider.enabled,
    hasKey: Boolean(provider.sealedKey),
  };
}
