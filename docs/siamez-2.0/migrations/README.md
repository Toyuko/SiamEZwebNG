# Platform 2.0 — Migration reports (Wave M0–M2)

Dry-run inventory tooling and non-destructive listing enhancements for published marketplace listings. **Non-destructive:** the Migration Engine never updates or deletes listing source fields (title, description, images, price, etc.). SEO/AI text lands only in the `ListingEnhancement` side table.

**M2 (marketplace engagement)** lives on branch `agent/m2-marketplace-engagement`: additive Prisma models `SavedListing`, `ListingView`, `CompareItem` (migration `20260802030000_add_marketplace_engagement`). Does not alter `sales_vehicles` / `sales_properties` content.

## Generate an inventory report (M0)

From the repo root (requires `DATABASE_URL` / Prisma client, same as local app):

```bash
npm run migrate:inventory-report
# or
npx tsx scripts/migrate-inventory-report.ts
```

Writes a timestamped markdown file:

```text
docs/siamez-2.0/migrations/inventory-YYYYMMDDTHHMMSSZ.md
```

Empty databases are fine — the report will show zero vehicles/properties.

## Enhance listings — SEO / AI side-fields (M1)

Default is **dry-run** (no DB writes). Pass `--apply` to upsert `ListingEnhancement` rows.

```bash
# Dry-run (default) — prints counts + sample payload
npm run migrate:enhance-listings
npm run migrate:enhance-listings -- --dry-run

# Apply — idempotent upsert into listing_enhancements only
npm run migrate:enhance-listings -- --apply
```

Behavior:

| Mode | Writes | Source listings |
|------|--------|-----------------|
| dry-run (default) | None | Unchanged |
| `--apply` | `ListingEnhancement` upsert | Unchanged (description/title/images/price untouched) |

Generation:

- Deterministic SEO title, description, keywords, short summary, and JSON-LD from existing title/description/specs.
- If `OPENAI_API_KEY` is set, the writer may refine `aiSummary` only — still written exclusively to enhancement fields.

Schema: polymorphic side table `listing_enhancements` keyed by `(listing_type, listing_id)` where `listing_id` is the listing cuid.

## Programmatic API

```ts
import {
  analyzePublishedListings,
  writeInventoryReportDryRun,
  enhanceListingDryRun,
  applyEnhancements,
  buildSalesListingPath,
  buildRealEstateListingPath,
  resolveListingMetadata,
} from "@/lib/migration";

// Read-only inventory
const { vehicles, properties, all } = await analyzePublishedListings();

// Dry-run report (optional write: false for in-memory only)
const report = await writeInventoryReportDryRun({ write: true });

// Enhancement dry-run / apply
const preview = await enhanceListingDryRun();
const applied = await applyEnhancements(); // ListingEnhancement only

// URL contract — cuid id, never slug
buildSalesListingPath({ id: listing.id });       // /sales/{cuid}
buildRealEstateListingPath({ id: listing.id });  // /real-estate/{cuid}

// Detail-page meta: enhancement first, then title/description slice
resolveListingMetadata(
  { title: listing.title, description: listing.description },
  enhancement
);
```

## URL contract (frozen)

| Division     | Public path              | Key   |
|-------------|--------------------------|-------|
| Vehicles    | `/sales/{cuid}`          | `id`  |
| Real estate | `/real-estate/{cuid}`    | `id`  |

Do **not** use `slug` in public detail URLs. Locale prefixes (`/en`, `/th`) are applied by next-intl; helpers also expose `buildLocalized*ListingPath` when needed. Sitemap includes published listing detail URLs via these helpers.

## What M0 / M1 do / do not do

| Does | Does not |
|------|----------|
| Inventory published listings | Delete listing rows |
| Write markdown inventory reports | Mutate listing description/title/images/price |
| Upsert `ListingEnhancement` SEO/AI side-fields | Overwrite `SalesVehicle` / `SalesProperty` source text |
| `generateMetadata` + JSON-LD on detail pages | Redesign inventory card UI |
| Enforce cuid URL helpers + tests | Change public `/sales/[id]` / `/real-estate/[id]` paths |

## Related docs

- [PLATFORM-MIGRATION-REPORT.md](../PLATFORM-MIGRATION-REPORT.md)
- [PLATFORM-ROADMAP.md](../PLATFORM-ROADMAP.md)
- [PLATFORM-AGENTS.md](../PLATFORM-AGENTS.md)
