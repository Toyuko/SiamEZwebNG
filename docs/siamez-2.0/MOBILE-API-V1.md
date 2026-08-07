# Mobile API v1 — Platform Synchronization Bridge

Thin REST adapters over existing Platform 2.0 / **2.1** engines. **Do not duplicate business logic** — routes call `data-access/*` and `lib/*` engines.

Auth: `Authorization: Bearer <JWT>` via `requireBearerApiUser` (never trusts client `x-api-user-id`).

Envelope: `{ success: true, data }` / `{ success: false, error }`.  
Rate limits may return **HTTP 429** with `Retry-After` (login / contact / upload).

## Marketplace

| Method | Path | Auth | Engine |
|--------|------|------|--------|
| GET | `/api/v1/marketplace/vehicles` | optional | `getPublicSalesVehicles` (+ `bounds`) |
| GET | `/api/v1/marketplace/vehicles/:id` | optional | includes `previousPriceAmount`, `isVerified` |
| GET | `/api/v1/marketplace/properties` | optional | `getPublicSalesProperties` |
| GET | `/api/v1/marketplace/properties/:id` | optional | includes maturity fields |
| GET | `/api/v1/marketplace/engagement` | required | saved / recent / compare hub |
| PUT/DELETE/GET | `/api/v1/marketplace/saved/:listingType/:listingId` | required | save/unsave |
| PUT/DELETE | `/api/v1/marketplace/compare/:listingType/:listingId` | required | compare tray (max 3) |
| POST | `/api/v1/marketplace/views/:listingType/:listingId` | required | record view |
| GET | `/api/v1/marketplace/:listingType/:listingId/related` | optional | related + people-also-viewed |
| GET/POST | `/api/v1/marketplace/enquiries` | GET required / POST optional | seller inbox / create enquiry |

`listingType` is `vehicle` \| `property`. Listing ids are **cuid** values.

Badges (client or server): `new` (14d), `featured` (active boost), `reduced` (previousPrice > price), `verified`.

## Saved searches (2.1)

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/api/v1/saved-searches` | required |
| DELETE | `/api/v1/saved-searches/:id` | required |

Body: `{ name, listingType, query: Record<string,string> }` · max 20 per owner.

## Goals / Life Events

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/api/v1/goals` | required |
| PATCH/DELETE | `/api/v1/goals/:goalId` | required |
| GET | `/api/v1/life-events` | optional |
| GET | `/api/v1/life-events/runs` | required |
| POST | `/api/v1/life-events/:lifeEventId/runs` | required |
| GET/PATCH | `/api/v1/life-events/runs/:progressId` | required |
| PATCH | `/api/v1/life-events/runs/:progressId/steps/:stepId` | required |

## Workflows (2.1)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/workflow-templates` | optional |
| GET/POST | `/api/v1/workflows/runs` | required · POST `{ templateId }` |
| GET/DELETE | `/api/v1/workflows/runs/:runId` | required · DELETE cancels |
| POST | `/api/v1/workflows/steps/:stepRunId/advance` | required |

## Search / Recommendations / Concierge / Flags

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/search?q=&locale=` | optional |
| GET | `/api/v1/recommendations?locale=&limit=` | required |
| POST | `/api/v1/concierge/chat` | optional |
| GET | `/api/v1/feature-flags` | optional |
| GET | `/api/v1/seller/analytics` | required |

## Seller listings (CRUD)

Owner inventory mutate routes. Create = any Bearer user (`createdById` set server-side). Update/delete = `admin` / `staff` **or** listing owner.

| Method | Path | Auth | Engine |
|--------|------|------|--------|
| GET/POST | `/api/v1/seller/listings/vehicles` | required | `getSalesVehiclesByOwner` / `createSalesVehicleListing` |
| PATCH/DELETE | `/api/v1/seller/listings/vehicles/:id` | required | `updateSalesVehicleListing` / `deleteSalesVehicleListing` |
| GET/POST | `/api/v1/seller/listings/properties` | required | `getSalesPropertiesByOwner` / `createSalesPropertyListing` |
| PATCH/DELETE | `/api/v1/seller/listings/properties/:id` | required | `updateSalesPropertyListing` / `deleteSalesPropertyListing` |

Body matches shared Zod schemas in `lib/marketplace/listing-schemas.ts` (vehicle / property listing fields). Server owns `slug` and `createdById`. Delete returns `{ deleted: true, id }`. Ownership failures → **403**; missing id → **404**.

### Concierge body (2.1)

```json
{
  "message": "string",
  "locale": "en|th",
  "history": [{ "role": "user|assistant", "content": "…" }],
  "journey": { "version": 1, "topics": [], "activeGoals": [], "…": "…" }
}
```

Reply may include `journey`, `goalChange`, `explanations`, and `reason` on recommendations/deepLinks. Persist `journey` client-side and resend on the next turn.

## Legacy contract fixes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/dashboard/overview` | Mobile hub counts |
| GET | `/api/documents` | Lists docs for Bearer user |
