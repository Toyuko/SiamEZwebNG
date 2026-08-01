import type { ExtractedFieldMap } from "./extract";

/**
 * Maps OCR / extract field keys → wizard form field names.
 * Only known contact / identity fields are applied by default.
 */
const DEFAULT_FIELD_MAP: Record<string, string> = {
  name: "name",
  fullName: "name",
  full_name: "name",
  email: "email",
  phone: "phone",
  telephone: "phone",
  nationality: "partnerNationality",
  partnerNationality: "partnerNationality",
  passportNumber: "passportNumber",
  idNumber: "idNumber",
  licenseNumber: "licenseNumber",
  paymentReference: "paymentReference",
};

export interface PrefillOptions {
  /** Current form values — non-empty values are never overwritten. */
  currentValues: Record<string, unknown>;
  /** Extra extractKey → formField overrides. */
  fieldMap?: Record<string, string>;
  /**
   * When set, only these form field names may be written
   * (intersection with mapped keys).
   */
  allowFields?: string[];
}

export interface PrefillPatch {
  /** Form field updates to apply (empty values already filtered). */
  values: Record<string, string>;
  /** Extract keys that were ignored (already filled or unmapped). */
  skipped: string[];
}

function isEmptyFormValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Convert extracted document fields into a safe wizard form patch.
 * Never overwrites non-empty existing values.
 */
export function extractedFieldsToWizardPrefill(
  fields: ExtractedFieldMap,
  options: PrefillOptions
): PrefillPatch {
  const map = { ...DEFAULT_FIELD_MAP, ...options.fieldMap };
  const values: Record<string, string> = {};
  const skipped: string[] = [];
  const allow = options.allowFields
    ? new Set(options.allowFields)
    : null;

  for (const [extractKey, raw] of Object.entries(fields)) {
    if (typeof raw !== "string") {
      skipped.push(extractKey);
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      skipped.push(extractKey);
      continue;
    }
    const formKey = map[extractKey];
    if (!formKey) {
      skipped.push(extractKey);
      continue;
    }
    if (allow && !allow.has(formKey)) {
      skipped.push(extractKey);
      continue;
    }
    if (!isEmptyFormValue(options.currentValues[formKey])) {
      skipped.push(extractKey);
      continue;
    }
    values[formKey] = trimmed;
  }

  return { values, skipped };
}

/** Apply a prefill patch via a setValue-like callback. */
export function applyWizardPrefill(
  patch: PrefillPatch,
  setValue: (name: string, value: string) => void
): string[] {
  const applied: string[] = [];
  for (const [name, value] of Object.entries(patch.values)) {
    setValue(name, value);
    applied.push(name);
  }
  return applied;
}
