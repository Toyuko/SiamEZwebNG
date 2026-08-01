export interface WizardAutosavePayload {
  version: 1;
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

export function autosaveStorageKey(serviceSlug: string, suffix?: string): string {
  return `${PREFIX}${suffix ?? serviceSlug}`;
}

export function loadAutosave(key: string): WizardAutosavePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardAutosavePayload;
    if (parsed?.version !== 1 || typeof parsed.values !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAutosave(key: string, payload: WizardAutosavePayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore for v1
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
