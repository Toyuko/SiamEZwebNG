# Marketplace — Automotive & Property

Two listing verticals share engagement infrastructure. **Preserve cuid URLs** — do not migrate to slugs.

---

## Public routes

| Vertical | Browse | Detail | API |
|----------|--------|--------|-----|
| Automotive | `/[locale]/sales` | `/[locale]/sales/[id]` | `GET /api/v1/marketplace/vehicles` |
| Property | `/[locale]/real-estate` | `/[locale]/real-estate/[id]` | `GET /api/v1/marketplace/properties` |

URL helpers (`src/lib/migration/urls.ts`):

```ts
buildSalesListingPath(id)      // → /sales/{cuid}
buildRealEstateListingPath(id) // → /real-estate/{cuid}
```

Models: `SalesVehicle`, `SalesProperty`. Enhancement side-store: `ListingEnhancement` (SEO/AI summary — never overwrites source description).

---

## Portal / admin

| Role | Automotive | Property |
|------|------------|----------|
| Seller portal | `/portal/sales` | `/portal/real-estate` |
| Admin | `/admin/sales` | `/admin/real-estate` |
| Enquiries | `/portal/enquiries` | (shared inbox) |

---

## Engagement stack

Shared via `src/lib/marketplace-engagement/**` and `src/data-access/marketplace-engagement.ts`.

| Feature | Model / store | Limit |
|---------|---------------|-------|
| Saved listings | `SavedListing` | per owner |
| Compare tray | cookie + DB merge | ≤ 3 items |
| Recently viewed | `ListingView` | capped history |
| Enquiries | `ListingEnquiry` | status workflow |

Owner resolution: signed-in `userId` or anonymous session cookie; merged on login.

REST: `/api/v1/marketplace/saved|compare|views|engagement`.

Web actions: `src/actions/marketplace-engagement.ts`.

---

## Platform 2.1 features

### Listing badges

`src/lib/marketplace/badges.ts` — `computeListingBadges`:

| Badge | Rule |
|-------|------|
| `new` | Created within 14 days (configurable) |
| `featured` | Active boost |
| `reduced` | `previousPriceAmount > priceAmount` |
| `verified` | Seller/listing verified flag |

UI: `src/components/marketplace/ListingBadges.tsx` on listing cards + detail.

### Saved searches

Model: `SavedSearch` (max 20 per owner).

- Actions: `src/actions/saved-searches.ts`
- Data access: `src/data-access/saved-searches.ts`
- Portal hub: `/portal/saved` (when `marketplace_beta` flag enabled)
- Stores serialized filter query JSON per listing type

### Related listings

`src/lib/marketplace/related-listings.ts` — same category/type, boosted first. Shown on detail pages via recommendation slots.

### People also viewed

`src/lib/marketplace/people-also-viewed.ts` — co-view scoring from bounded `ListingView` history (no ML).

### Seller analytics

`src/data-access/seller-analytics.ts` — `getSellerListingViewStats`:

- Per-listing view counts (`ListingView.groupBy`)
- Enquiry counts (`ListingEnquiry.groupBy`)
- Totals for seller dashboard

Not a full funnel/impression product — views + enquiries only.

### Buyer hub

`/portal/saved` — saved listings, compare tray, recent views, saved searches. No separate `/portal/buyer` shell.

---

## Featured / boost

- Homepage carousel + category featured sections
- Boost packages: `src/lib/sales-boost-packages.ts`
- `isBoosted` + `boostExpiresAt` drive featured badge and sort bias

---

## Recommendations integration

Detail pages use `SuggestionSlot` for related packages (automotive + property parity as of 2.1 Phase 2).

Concierge and unified search deep-link to listing cuid URLs.

Graph edges: admin `/admin/recommendations` + `RecommendationEdge` table.

---

## Search performance note

Unified search (`src/lib/search/load.ts`) pulls ≤200 listings per type and rebuilds Fuse index **per request**. No cache yet — see audit performance section.

---

## Preserve rules

1. Do not delete existing listings during migrations
2. Public URLs remain `/sales/[cuid]` and `/real-estate/[cuid]`
3. Mobile clients use cuid in API paths
4. Additive enhancement only (`ListingEnhancement`, badges, analytics)

---

## Tests

- `tests/unit/listing-badges.test.ts`
- `tests/unit/marketplace-engagement.test.ts`
- `tests/unit/migration-urls.test.ts`
- `tests/unit/listing-enquiries.test.ts`
