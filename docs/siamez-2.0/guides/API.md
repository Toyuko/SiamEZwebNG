# SiamEZ Platform — API Map

**Contracts:** [API-CONTRACTS.md](../API-CONTRACTS.md) · [MOBILE-API-V1.md](../MOBILE-API-V1.md)  
**Typed map:** `src/lib/api-contracts.ts`  
**Envelope:** `{ success: true, data }` | `{ success: false, error }` via `src/lib/api-response.ts`

---

## Pattern: Server Actions vs REST

| Use case | Pattern | Location |
|----------|---------|----------|
| Web forms, admin CRUD, portal mutations | Server Actions | `src/actions/**` |
| Mobile sync, external clients, Concierge tools | REST | `src/app/api/**` |

**Rule:** Do not duplicate business logic. REST routes call the same `data-access/*` and `lib/*` engines as Server Actions.

---

## Authentication

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | none | Returns Bearer JWT + user; rate-limited 20/min |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/register` | none | Mobile registration |
| * | `/api/auth/[...nextauth]/*` | — | Auth.js web session |

Mobile JWT verified by `requireBearerApiUser` (never trusts client-supplied `x-api-user-id` except after middleware verify on legacy prefixes).

Middleware JWT paths: `/api/cases`, `/api/documents`, `/api/invoices`, `/api/payments`.

---

## `/api/v1/*` — Platform engines

### Marketplace

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/marketplace/vehicles` | optional |
| GET | `/api/v1/marketplace/vehicles/[id]` | optional |
| GET | `/api/v1/marketplace/properties` | optional |
| GET | `/api/v1/marketplace/properties/[id]` | optional |
| GET | `/api/v1/marketplace/engagement` | required |
| PUT/DELETE/GET | `/api/v1/marketplace/saved/[listingType]/[listingId]` | required |
| PUT/DELETE | `/api/v1/marketplace/compare/[listingType]/[listingId]` | required |
| POST | `/api/v1/marketplace/views/[listingType]/[listingId]` | required |

`listingType`: `vehicle` | `property`. IDs are **cuid**.

### Goals

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/api/v1/goals` | required |
| PATCH/DELETE | `/api/v1/goals/[goalId]` | required |

### Life events

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/life-events` | optional |
| GET | `/api/v1/life-events/runs` | required |
| POST | `/api/v1/life-events/[lifeEventId]/runs` | required |
| GET/PATCH | `/api/v1/life-events/runs/[progressId]` | required |
| PATCH | `/api/v1/life-events/runs/[progressId]/steps/[stepId]` | required |

### Workflows

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/workflow-templates` | optional |

**Gap:** No `/api/v1` workflow **run** CRUD — web uses Server Actions + portal UI only.

### Search

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/search?q=&locale=` | optional (Bearer scopes goals/bookings) |

### Recommendations

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/recommendations?locale=&limit=` | required |

### Concierge (with journey)

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/v1/concierge/chat` | optional | `{ message, locale?, history?, journey? }` |

Wraps `requestConciergeReply`. `journey` is a `ConciergeJourneyContext` snapshot from client session storage.

---

## Admin analytics export

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/admin/analytics/export` | staff session | CSV attachment |

Metrics from `getPlatformAnalytics()` — marketplace views, enquiries, case funnel, workflow completion, revenue, tracked events.

---

## Legacy protected REST

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/cases`, `/api/cases/[id]` | Bearer |
| GET/POST | `/api/documents`, `/api/documents/upload` | Bearer |
| GET | `/api/invoices`, `/api/payments` | Bearer |
| GET | `/api/dashboard/overview` | Bearer |

---

## Other notable routes

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/upload` | Authenticated media upload; rate-limited |
| POST | `/api/contact` | Public contact form; rate-limited |
| GET | `/api/portal/export-data` | GDPR JSON export (portal session) |

---

## Server Actions (web-primary)

Key action modules (not exhaustive):

| Module | Examples |
|--------|----------|
| `src/actions/auth.ts` | register, profile |
| `src/actions/booking.ts` | `submitBooking` → Case |
| `src/actions/marketplace-engagement.ts` | save, compare, view |
| `src/actions/saved-searches.ts` | CRUD saved searches |
| `src/actions/feature-flags.ts` | admin toggle |
| `src/actions/workflows.ts` | start/advance/approve runs |
| `src/actions/life-events.ts` | progress steps |

All mutating actions must call `requireAuth` / `requireStaff` as appropriate.

---

## Concierge tools (internal, not HTTP)

| Tool | Mutating | Module |
|------|----------|--------|
| Unified search | No | `src/lib/ai/tools/search-unified.ts` |
| Recommend | No | `src/lib/ai/tools/recommend.ts` |
| Open link | No | `src/lib/ai/tools/open-link.ts` |
| Escalate human | No | `src/lib/ai/tools/escalate-human.ts` |
| Orchestrate LE/workflow | Yes (auth) | `src/lib/ai/orchestrate.ts` |

---

## Gaps / deferred

- Full OpenAPI export
- Workflow run REST APIs for mobile
- ETags / delta sync
- Uniform Zod on all mutating v1 routes
- Search corpus caching (rebuilt per request today)

See [MOBILE-API-V1.md](../MOBILE-API-V1.md) for mobile client integration notes.
