export interface WizardAutosavePayload {
  /** v2 = post redesign step consolidation; v1 drafts are ignored to avoid wrong step mapping */
  version: 1 | 2;
  serviceSlug: string;
  stepIndex: number;
  values: Record<string, unknown>;
  documents: Array<{
    name: string;
    size?: number;
    mimeType?: string;
    documentType?: string;
    /** Persisted Document.id when upload succeeded (authenticated). */
    documentId?: string;
    /** Checklist item id from wizard requiredDocuments. */
    requiredId?: string;
    uploadStatus?: "pending" | "uploaded" | "metadata" | "error";
  }>;
  postToMarketplace: boolean;
  savedAt: string;
}

const PREFIX = "siamez:wizard:";
const CURRENT_VERSION = 2 as const;

export function autosaveStorageKey(serviceSlug: string, suffix?: string): string {
  return `${PREFIX}${suffix ?? serviceSlug}`;
}

export function loadAutosave(key: string): WizardAutosavePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardAutosavePayload;
    // Accept current version only — older drafts used a different step order.
    if (parsed?.version !== CURRENT_VERSION || typeof parsed.values !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAutosave(key: string, payload: Omit<WizardAutosavePayload, "version"> & { version?: 1 | 2 }): void {
  if (typeof window === "undefined") return;
  try {
    const next: WizardAutosavePayload = {
      ...payload,
      version: CURRENT_VERSION,
    };
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearAutosave(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
