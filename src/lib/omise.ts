import { createHmac, timingSafeEqual } from "node:crypto";

const OMISE_API = "https://api.omise.co/charges";

function getOmiseSecretKey(): string | null {
  const k = process.env.OMISE_SECRET_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

function getOmiseWebhookSecret(): string | null {
  const k = process.env.OMISE_WEBHOOK_SECRET?.trim();
  return k && k.length > 0 ? k : null;
}

function basicAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`;
}

export function isOmiseBoostConfigured(): boolean {
  return Boolean(getOmiseSecretKey());
}

export type OmiseChargeCreateResult = {
  ok: true;
  chargeId: string;
  status: string;
  qrImageUrl?: string;
  authorizeUri?: string;
  raw: unknown;
};

export type OmiseChargeCreateError = { ok: false; error: string };

/**
 * Creates a PromptPay charge (amount in THB whole baht → satang).
 * Metadata is attached for webhook fulfillment.
 */
export async function createOmisePromptPayCharge(input: {
  amountThb: number;
  metadata: Record<string, string>;
  description?: string;
}): Promise<OmiseChargeCreateResult | OmiseChargeCreateError> {
  const secret = getOmiseSecretKey();
  if (!secret) {
    return { ok: false, error: "Omise is not configured (OMISE_SECRET_KEY)." };
  }

  const amountSatang = Math.round(input.amountThb * 100);
  if (!Number.isFinite(amountSatang) || amountSatang < 100) {
    return { ok: false, error: "Invalid amount" };
  }

  const body = new URLSearchParams();
  body.set("amount", String(amountSatang));
  body.set("currency", "thb");
  body.set("description", input.description ?? "SiamEZ listing boost");
  for (const [key, value] of Object.entries(input.metadata)) {
    body.set(`metadata[${key}]`, value);
  }
  body.set("source[type]", "promptpay");

  const res = await fetch(OMISE_API, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(secret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof json.message === "string"
        ? json.message
        : typeof json.object === "string" && json.object === "error"
          ? JSON.stringify(json)
          : `Omise HTTP ${res.status}`;
    return { ok: false, error: msg };
  }

  const id = typeof json.id === "string" ? json.id : "";
  if (!id) {
    return { ok: false, error: "Omise response missing charge id" };
  }

  const status = typeof json.status === "string" ? json.status : "unknown";
  let qrImageUrl: string | undefined;
  let authorizeUri: string | undefined;

  const source = json.source;
  if (source && typeof source === "object") {
    const s = source as Record<string, unknown>;
    if (typeof s.scannable_image === "object" && s.scannable_image) {
      const img = s.scannable_image as Record<string, unknown>;
      if (typeof img.download_uri === "string") qrImageUrl = img.download_uri;
      else if (typeof img.uri === "string") qrImageUrl = img.uri;
    }
    if (typeof s.authorize_uri === "string") authorizeUri = s.authorize_uri;
  }
  if (typeof json.authorize_uri === "string") authorizeUri = json.authorize_uri;

  return {
    ok: true,
    chargeId: id,
    status,
    qrImageUrl,
    authorizeUri,
    raw: json,
  };
}

/** Verifies `X-Omise-Signature` against raw webhook body (hex digest). */
export function verifyOmiseWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getOmiseWebhookSecret();
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader.trim(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseOmiseChargeCompleteEvent(payload: unknown): {
  chargeId: string;
  paid: boolean;
  metadata: Record<string, string>;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const key = typeof root.key === "string" ? root.key : "";
  if (key !== "charge.complete") return null;

  const data = root.data;
  if (!data || typeof data !== "object") return null;
  const charge = data as Record<string, unknown>;
  const chargeId = typeof charge.id === "string" ? charge.id : "";
  if (!chargeId) return null;

  const status = typeof charge.status === "string" ? charge.status : "";
  const paid = charge.paid === true || status === "successful";

  const metaRaw = charge.metadata;
  const metadata: Record<string, string> = {};
  if (metaRaw && typeof metaRaw === "object") {
    for (const [k, v] of Object.entries(metaRaw as Record<string, unknown>)) {
      if (typeof v === "string") metadata[k] = v;
      else if (typeof v === "number" && Number.isFinite(v)) metadata[k] = String(v);
    }
  }

  return { chargeId, paid, metadata };
}
