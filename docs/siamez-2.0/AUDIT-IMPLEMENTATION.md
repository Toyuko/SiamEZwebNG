# Platform 2.0 — Audit implementation decisions

**Approved:** Priority list as-is (2026-08-02)  
**Branch:** `siamez-2.0`

## Architectural decisions

1. **Admin bypass** — `isAdminAuthBypassEnabled()` ignores `BYPASS_ADMIN_AUTH` when `VERCEL_ENV` is `production`/`preview` or `NODE_ENV=production`. Local/dev only.
2. **Document upload ownership** — Shared `assertCanAttachDocumentToCase` used by Server Action + `POST /api/documents/upload`. `getApiUser` always returns DB `role`.
3. **AI listing summaries** — Additive UI via `ListingAiSummary`; source `description` never overwritten (`ListingEnhancement` side-store).
4. **Homepage** — Goal-first section below hero; classic ServiceGrid retained further down.
5. **Concierge orchestration** — Auth-gated LE/workflow start; guests get login deep-links; escalate via WhatsApp/LINE tools (non-mutating).
6. **Goal ↔ Workflow** — Nullable `Goal.workflowTemplateId`; LE progress syncs linked goals via `syncLinkedGoalsFromLifeEvent`.
7. **Recommendations** — Configurable graph in `src/config/recommendation-graph.ts` + admin `RecommendationEdge` table; engine falls back to defaults.
8. **Search** — Divisions extended: life_event (public), goal/booking (session-scoped).
9. **Enquiries** — `ListingEnquiry` additive model; WhatsApp CTAs preserved alongside form.
10. **API contracts** — Typed map in `src/lib/api-contracts.ts` + `API-CONTRACTS.md`; OpenAPI export deferred until App 2.0 GA.
