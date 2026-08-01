# Platform 2.0 — Migration reports (Wave M0)

Dry-run inventory tooling for published marketplace listings. **Non-destructive:** the Migration Engine reads `SalesVehicle` / `SalesProperty` only and never updates or deletes listing source fields (title, description, images, price, etc.). Enhancement tables land in Wave M1.

## Generate an inventory report

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

## Programmatic API

```ts
import {
  analyzePublishedListings,
  writeInventoryReportDryRun,
  buildSalesListingPath,
  buildRealEstateListingPath,
} from "@/lib/migration";

// Read-only inventory
const { vehicles, properties, all } = await analyzePublishedListings();

// Dry-run report (optional write: false for in-memory only)
const report = await writeInventoryReportDryRun({ write: true });

// URL contract — cuid id, never slug
buildSalesListingPath({ id: listing.id });       // /sales/{cuid}
buildRealEstateListingPath({ id: listing.id });  // /real-estate/{cuid}
```

## URL contract (frozen)

| Division     | Public path              | Key   |
|-------------|--------------------------|-------|
| Vehicles    | `/sales/{cuid}`          | `id`  |
| Real estate | `/real-estate/{cuid}`    | `id`  |

Do **not** use `slug` in public detail URLs. Locale prefixes (`/en`, `/th`) are applied by next-intl; helpers also expose `buildLocalized*ListingPath` when needed.

## What M0 does / does not do

| Does | Does not |
|------|----------|
| Inventory published listings | Change Prisma schema |
| Write markdown reports here | Mutate listing rows or media |
| Enforce cuid URL helpers + tests | Touch sales/RE page UI |
| Dry-run only | AI enhancement writes (M1) |

## Related docs

- [PLATFORM-MIGRATION-REPORT.md](../PLATFORM-MIGRATION-REPORT.md)
- [PLATFORM-ROADMAP.md](../PLATFORM-ROADMAP.md)
- [PLATFORM-AGENTS.md](../PLATFORM-AGENTS.md)
