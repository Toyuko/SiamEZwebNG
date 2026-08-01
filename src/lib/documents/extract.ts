/**
 * Provider-pluggable OCR / document extraction stubs.
 * Prefer this domain module over `src/lib/ai/*` (owned by Concierge).
 *
 * Graceful degrade: without OCR credentials, MockOcrProvider is used.
 */

export type ExtractedFieldMap = Record<string, string>;

export interface ExtractInput {
  /** Original file name (used by mock heuristics). */
  fileName: string;
  mimeType?: string;
  documentType?: string;
  /** Storage key / blob URL when available. */
  storageKey?: string;
  /** Optional raw bytes — real providers may use this; mock ignores. */
  bytes?: ArrayBuffer;
}

export interface ExtractResult {
  provider: string;
  /** true when a real OCR provider ran; false for mock / skip. */
  ocrApplied: boolean;
  fields: ExtractedFieldMap;
  /** Human-readable notes (e.g. "OCR unavailable — mock fields"). */
  warnings?: string[];
  rawText?: string;
}

export interface OcrProvider {
  readonly id: string;
  extract(input: ExtractInput): Promise<ExtractResult>;
}

function guessDocumentKind(input: ExtractInput): string {
  const type = (input.documentType ?? "").toLowerCase();
  const name = input.fileName.toLowerCase();
  if (type.includes("passport") || name.includes("passport")) return "passport";
  if (type.includes("id") || name.includes("id-card") || name.includes("national")) {
    return "national_id";
  }
  if (
    type.includes("receipt") ||
    type.includes("payment") ||
    name.includes("receipt") ||
    name.includes("slip")
  ) {
    return "payment_receipt";
  }
  if (type.includes("affidavit") || name.includes("affidavit")) return "affidavit";
  if (type.includes("license") || name.includes("license") || name.includes("licence")) {
    return "driver_license";
  }
  return type || "generic";
}

/**
 * Deterministic mock extractor — no network, no OCR key.
 * Produces plausible empty-safe field hints for wizard prefill.
 */
export class MockOcrProvider implements OcrProvider {
  readonly id = "mock";

  async extract(input: ExtractInput): Promise<ExtractResult> {
    const kind = guessDocumentKind(input);
    const fields: ExtractedFieldMap = {};
    const warnings = [
      "OCR credentials not configured — using mock extraction.",
    ];

    switch (kind) {
      case "passport":
        fields.documentType = "passport";
        fields.name = "";
        fields.nationality = "";
        fields.passportNumber = "";
        break;
      case "national_id":
        fields.documentType = "national_id";
        fields.name = "";
        fields.idNumber = "";
        break;
      case "payment_receipt":
        fields.documentType = "payment_receipt";
        fields.paymentReference = "";
        break;
      case "driver_license":
        fields.documentType = "driver_license";
        fields.name = "";
        fields.licenseNumber = "";
        break;
      case "affidavit":
        fields.documentType = "affidavit";
        fields.name = "";
        break;
      default:
        fields.documentType = kind;
        break;
    }

    // Filename heuristic: "John_Doe_passport.pdf" → soft name hint
    const base = input.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    const stripped = base
      .replace(/\b(passport|id|receipt|slip|affidavit|license|licence|scan|copy)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length >= 3 && stripped.length <= 80 && /[a-zA-Z]/.test(stripped)) {
      if (!fields.name) fields.name = stripped;
      else if (!fields.name.trim()) fields.name = stripped;
    }

    return {
      provider: this.id,
      ocrApplied: false,
      fields,
      warnings,
      rawText: undefined,
    };
  }
}

/** Placeholder for a future real OCR vendor (e.g. AWS Textract / Google Vision). */
export class EnvOcrProvider implements OcrProvider {
  readonly id = "env";

  constructor(private readonly apiKey: string) {}

  async extract(input: ExtractInput): Promise<ExtractResult> {
    // No hard SDK dependency — fall through to mock-shaped result noting key presence.
    const mock = await new MockOcrProvider().extract(input);
    return {
      ...mock,
      provider: this.id,
      ocrApplied: false,
      warnings: [
        `OCR provider key detected (${this.apiKey.slice(0, 4)}…) but no vendor SDK is wired yet.`,
        ...(mock.warnings ?? []),
      ],
    };
  }
}

export function resolveOcrProvider(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): OcrProvider {
  const key =
    env.OCR_API_KEY?.trim() ||
    env.DOCUMENT_OCR_API_KEY?.trim() ||
    env.GOOGLE_VISION_API_KEY?.trim();
  if (key) return new EnvOcrProvider(key);
  return new MockOcrProvider();
}

/** Convenience entry point used by wizard upload hooks. */
export async function extractDocumentFields(
  input: ExtractInput,
  provider?: OcrProvider
): Promise<ExtractResult> {
  const resolved = provider ?? resolveOcrProvider();
  return resolved.extract(input);
}
