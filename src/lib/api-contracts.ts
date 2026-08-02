/**
 * Platform API contracts for SiamEZ App 2.0 / future agents.
 * Thin shared shapes — not a full OpenAPI server yet.
 * Keep in sync with routes under src/app/api/**.
 */

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Documented public/mobile API surface (contract map). */
export const PLATFORM_API_CONTRACTS = {
  auth: {
    login: { method: "POST", path: "/api/auth/login", auth: "none" },
    me: { method: "GET", path: "/api/auth/me", auth: "bearer" },
  },
  cases: {
    list: { method: "GET", path: "/api/cases", auth: "bearer" },
    get: { method: "GET", path: "/api/cases/[id]", auth: "bearer" },
  },
  documents: {
    list: { method: "GET", path: "/api/documents", auth: "bearer" },
    upload: {
      method: "POST",
      path: "/api/documents/upload",
      auth: "bearer",
      notes: "Requires case ownership (or staff) when caseId is set",
    },
  },
  invoices: {
    list: { method: "GET", path: "/api/invoices", auth: "bearer" },
  },
  payments: {
    list: { method: "GET", path: "/api/payments", auth: "bearer" },
  },
  conciergeTools: {
    searchUnified: { module: "src/lib/ai/tools/search-unified.ts", mutating: false },
    recommend: { module: "src/lib/ai/tools/recommend.ts", mutating: false },
    escalateHuman: { module: "src/lib/ai/tools/escalate-human.ts", mutating: false },
    orchestrate: {
      module: "src/lib/ai/orchestrate.ts",
      mutating: true,
      notes: "Auth-gated life-event / workflow start",
    },
  },
} as const;

export type PlatformApiContractMap = typeof PLATFORM_API_CONTRACTS;
