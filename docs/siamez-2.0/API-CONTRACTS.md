# SiamEZ Platform 2.0 — API Contracts

**Status:** Scaffold (P3)  
**Source of truth (typed):** `src/lib/api-contracts.ts`  
**Envelope:** `{ success: true, data }` | `{ success: false, error }` via `src/lib/api-response.ts`

## Auth

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | none |
| GET | `/api/auth/me` | Bearer JWT |

Mobile clients use `Authorization: Bearer <API_JWT>`. Middleware sets `x-api-user-id` after verify on protected prefixes.

## Protected REST (Bearer)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/cases` | Caller’s cases |
| GET | `/api/cases/[id]` | Ownership enforced |
| GET | `/api/documents` | Caller’s documents |
| POST | `/api/documents/upload` | **Case ownership** when `caseId` set (parity with Server Action) |
| GET | `/api/invoices` | Caller’s invoices |
| GET | `/api/payments` | Caller’s payments |

## App 2.0 preview (`/api/v1/*`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/marketplace/vehicles` | Public inventory |
| GET | `/api/v1/marketplace/properties` | Public inventory (`sellerKind`: dealer\|private\|all) |
| GET/POST | `/api/v1/marketplace/saved|views|compare|engagement` | Engagement (auth when mutating) |
| GET/POST | `/api/v1/goals` | Customer goals |

## Concierge / agent tools

| Tool | Mutating | Module |
|------|----------|--------|
| Unified search | No | `src/lib/ai/tools/search-unified.ts` |
| Recommend | No | `src/lib/ai/tools/recommend.ts` |
| Escalate human | No | `src/lib/ai/tools/escalate-human.ts` |
| Orchestrate LE/Workflow | Yes (auth) | `src/lib/ai/orchestrate.ts` |

## Decision

- Keep Server Actions as the primary web mutation path.
- Expand this map + OpenAPI export before App 2.0 GA.
- Do not invent parallel case/booking APIs.
