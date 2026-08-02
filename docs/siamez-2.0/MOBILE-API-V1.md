# Mobile API v1 — Platform Synchronization Bridge

Thin REST adapters over existing Platform 2.0 engines. **Do not duplicate business logic** — routes call `data-access/*` and `lib/*` engines.

Auth: `Authorization: Bearer <JWT>` via `requireBearerApiUser` (never trusts client `x-api-user-id`).

## Marketplace

| Method | Path | Auth | Engine |
|--------|------|------|--------|
| GET | `/api/v1/marketplace/vehicles` | optional | `getPublicSalesVehicles` |
| GET | `/api/v1/marketplace/vehicles/:id` | optional | `getPublicSalesVehicleById` |
| GET | `/api/v1/marketplace/properties` | optional | `getPublicSalesProperties` |
| GET | `/api/v1/marketplace/properties/:id` | optional | `getPublicSalesPropertyById` |
| GET | `/api/v1/marketplace/engagement` | required | saved / recent / compare hub |
| PUT/DELETE/GET | `/api/v1/marketplace/saved/:listingType/:listingId` | required | save/unsave |
| PUT/DELETE | `/api/v1/marketplace/compare/:listingType/:listingId` | required | compare tray |
| POST | `/api/v1/marketplace/views/:listingType/:listingId` | required | record view |

`listingType` is `vehicle` \| `property`. Listing ids are **cuid** values.

## Goals / Life Events / Workflows

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/api/v1/goals` | required |
| PATCH/DELETE | `/api/v1/goals/:goalId` | required |
| GET | `/api/v1/life-events` | optional |
| GET | `/api/v1/life-events/runs` | required |
| POST | `/api/v1/life-events/:lifeEventId/runs` | required |
| GET/PATCH | `/api/v1/life-events/runs/:progressId` | required |
| PATCH | `/api/v1/life-events/runs/:progressId/steps/:stepId` | required |
| GET | `/api/v1/workflow-templates` | optional |

## Search / Recommendations / Concierge

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/search?q=&locale=` | optional (user-scoped goals/bookings when Bearer present) |
| GET | `/api/v1/recommendations?locale=&limit=` | required |
| POST | `/api/v1/concierge/chat` | optional | wraps `requestConciergeReply` |

## Legacy contract fixes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/dashboard/overview` | Mobile hub counts |
| GET | `/api/documents` | Lists docs for Bearer user |

Envelope: `{ success: true, data }` / `{ success: false, error }`.
