# SiamEZ Platform 2.0 — Marketplace & Ecosystem Roadmap

**Prerequisite:** [PLATFORM-MIGRATION-REPORT.md](./PLATFORM-MIGRATION-REPORT.md)  
**Integration branch:** `siamez-2.0`  
**Status:** **Full M0–M7 approved** (2026-08-02) · **M0–M5 merged** (`8516a3a`) · Wave **M6** landed on `agent/m6-unified-dashboards` (not merged) · Wave **M7** next  
**Rule:** No division rewrite. Additive engines. Preserve URLs and data.

---

## Wave M0 — Freeze & Migration Engine scaffold

| | |
|--|--|
| **Objective** | Inventory tooling + rollback-safe enhancement tables |
| **Deliverables** | Migration Engine CLI/report; snapshot of listing IDs; contract tests for `/sales/[id]` & `/real-estate/[id]` |
| **Owns** | `src/lib/migration/**`, `scripts/migrate-*`, docs under `docs/siamez-2.0/migrations/` |
| **Risk** | Low |
| **Acceptance** | Report lists all published vehicles/properties; dry-run never writes destructive changes |

---

## Wave M1 — Listing enhancement (non-destructive)

| | |
|--|--|
| **Objective** | AI summary, SEO meta, structured data, keyword suggestions |
| **Deliverables** | Nullable side fields or `ListingEnhancement` table; `generateMetadata` on detail pages; sitemap per-listing URLs; JSON-LD |
| **Preserve** | title, description, images, price, seller, status |
| **Risk** | Med (SEO regressions) |
| **Acceptance** | Existing cuid URLs unchanged; Google-readable meta; enhancements regenerable |

---

## Wave M2 — Marketplace engagement

| | |
|--|--|
| **Objective** | Saved, recently viewed, compare |
| **Deliverables** | Models + portal/buyer UI; anonymous cookie → account merge |
| **Risk** | Low–Med |
| **Acceptance** | Save/unsave vehicle & property; compare ≤3; history list |

---

## Wave M3 — Unified Search

| | |
|--|--|
| **Objective** | One search bar across divisions |
| **Deliverables** | Search document projection (services ∪ vehicles ∪ properties ∪ help stubs); grouped results UI; Concierge tool |
| **Reuse** | Fuse/cmdk patterns; do not remove service palette |
| **Risk** | Med |
| **Acceptance** | Query returns typed groups; deep-links preserve URL contracts |

---

## Wave M4 — Goals + Life Events Engines

| | |
|--|--|
| **Objective** | Configurable journeys (not hard-coded) |
| **Deliverables** | Admin CRUD for Life Event definitions; Goal capture; graph of steps → services/listings; customer progress |
| **Example** | Moving to Thailand → property → translation → DL → vehicle → registration → insurance |
| **Risk** | High (scope) |
| **Acceptance** | Admin can create/edit events without deploy; customer can start event and see checklist |

---

## Wave M5 — Recommendations + Concierge orchestration

| | |
|--|--|
| **Objective** | Data-driven cross-sell; Concierge spans divisions |
| **Deliverables** | Rec engine inputs (views, saves, bookings, goals); listing/service/life-event suggestions; Concierge tools for search listings |
| **Risk** | Med |
| **Acceptance** | Viewing motorcycle surfaces insurance/registration packages; Concierge can open `/sales/[id]` |

---

## Wave M6 — Unified dashboards

| | |
|--|--|
| **Objective** | Single customer workspace; seller/buyer surfaces |
| **Deliverables** | Extend portal home; seller analytics (views stub OK); buyer saved/compare hub |
| **Preserve** | Existing portal role redirects (freelancer/company) |
| **Risk** | Med |
| **Acceptance** | Customer sees goals, events, bookings, saved listings, docs, invoices in one shell |

---

## Wave M7 — Universal Workflow templates

| | |
|--|--|
| **Objective** | Reusable workflows beyond booking wizards |
| **Deliverables** | Template + run models; staff approval steps; AI next-steps; ties to Case when booking |
| **Risk** | High |
| **Acceptance** | Inspection booking / viewing booking as workflow templates; timeline in customer + staff UI |

---

## Cross-cutting packages (attach to waves)

| Package | Waves |
|---------|-------|
| Automotive packages (inspection, registration, insurance, transfer, tax, ownership cost) | M5–M7 (link existing service slugs) |
| RE packages (viewing, legal, translation, insurance) | M5–M7 |
| Map-ready RE | M1–M2 (lat/lng optional fields; no map vendor lock-in) |
| Financing / mortgage / warranty | Stub interfaces only until partners exist |
| Blog / Help Centre | After M3 (search consumers) |

---

## Agent ownership (proposed)

| Agent | Wave | Owns |
|-------|------|------|
| M-01 Migration Analyst | M0 | Reports, inventories |
| M-02 Migration Engine | M0–M1 | `lib/migration`, enhancement writes |
| M-03 Automotive UX | M1–M2, packages | `sales/**` UI only |
| M-04 Real Estate UX | M1–M2, packages | `real-estate/**` UI only |
| M-05 Search Platform | M3 | Search index + UI |
| M-06 Goals & Life Events | M4 | Definitions + admin + customer progress |
| M-07 Recommendations & Concierge | M5 | Rec engine + AI tools |
| M-08 Dashboards | M6 | Portal customer/seller/buyer |
| M-09 Workflow Engine | M7 | Templates + runs |
| M-10 QA / SEO / Rollback | Continuous | Contract tests, release reports |

---

## Merge rules

1. Diff must not delete published listing rows.  
2. Public cuid URLs must keep working (automated test).  
3. AI text lands in enhancement fields, not over `description` by default.  
4. New engines are additive modules under `src/lib/{goals,life-events,recommendations,workflows,search,migration}/`.  
5. Orchestrator review before any schema drop.

---

## Approval gate

**Approved:** full M0–M7 (2026-08-02).  
**M0:** Merged (`7bb5925`) — `npm run migrate:inventory-report`  
**M1:** Merged (`2eb0534`) — `ListingEnhancement` + `migrate:enhance-listings`  
**M2:** Merged (`e563b69`) — `SavedListing` / `ListingView` / `CompareItem` + portal hub `/portal/saved`.  
**M3:** Merged (`01218f1`) — unified search (`src/lib/search/**` + header ⌘K + Concierge tool).  
**M4:** Landed on branch `agent/m4-goals-life-events` — Goals + Life Events Engines (not merged to `siamez-2.0` yet).  
**M5:** Merged (`8516a3a`) — Recommendations engine + Concierge orchestration.  
**M6:** Landed on branch `agent/m6-unified-dashboards` — Unified customer workspace + seller views stub (not merged to `siamez-2.0` yet).  
**Active wave:** M7 — Universal Workflow templates (after M6 merge).  
**M1 commands:** `npm run migrate:enhance-listings` (dry-run default) · `--apply` upserts `ListingEnhancement` only.

---

## M2 note (merged at e563b69)

Wave M2 adds marketplace engagement without mutating listing source content:

| Model | Purpose |
|-------|---------|
| `SavedListing` | Save/unsave keyed by `ownerKey` (`user:` / `anon:`) |
| `ListingView` | Recently viewed (capped/pruned at 40) |
| `CompareItem` | Compare tray ≤3; vehicle + property mix allowed |

Anonymous cookie `siamez_mp_sid` merges into the Auth.js user on login (best-effort) and on the next engagement Server Action. Public cuid URLs unchanged (`/sales/{id}`, `/real-estate/{id}`).

---

## M3 note (merged)

Wave M3 adds **unified search** across divisions without redesigning marketplace pages:

| Piece | Location |
|-------|----------|
| Search projection / Fuse query | `src/lib/search/**` |
| Concierge tool (no OpenAI required) | `src/lib/ai/tools/search-unified.ts` |
| Grouped results UI | `src/components/search/UnifiedSearchPalette.tsx` (+ header ⌘K) |
| Service palette | Kept on `/services` (`disableGlobalShortcut` so site search owns ⌘K) |

URL contracts preserved: vehicles → `/sales/{cuid}`, properties → `/real-estate/{cuid}`, services → `/services/{slug}` (book: `/book/{slug}`). Listing description fields are never written by search.

---

## M4 note (branch `agent/m4-goals-life-events`)

Wave M4 adds **configurable Life Events + Goals** without hard-coded journey pages:

| Piece | Location |
|-------|----------|
| Prisma models | `LifeEvent`, `LifeEventStep`, `LifeEventProgress`, `LifeEventStepProgress`, `Goal` |
| Migration folder | `prisma/migrations/20260802040000_add_goals_life_events/` (prefer `npx prisma db push` locally if older migrations fail) |
| Engines | `src/lib/life-events/**`, `src/lib/goals/**` |
| Admin CRUD | `/admin/life-events` |
| Customer checklist | `/portal/goals` |
| Seed example | `moving-to-thailand` → property → translation → DL → vehicle → registration |

Listing deep links in step targets use **cuid** via Migration Engine helpers (`/sales/{cuid}`, `/real-estate/{cuid}`). SalesVehicle / SalesProperty content is never mutated.

---

## M5 note (branch `agent/m5-recommendations-concierge`)

Wave M5 adds **data-driven cross-sell + Concierge orchestration** across divisions:

| Piece | Location |
|-------|----------|
| Recommendations engine | `src/lib/recommendations/**` (deterministic rules; optional polish degrades without `OPENAI_API_KEY`) |
| Inputs | ListingView / SavedListing engagement, lightweight bookings/cases, goals / life-event progress |
| Outputs | Typed suggestions: services (slug), listings (cuid URLs), life events |
| Concierge tools | `search-unified.ts` wired into replies; `tools/recommend.ts`; `tools/open-link.ts` (`/sales/{cuid}`) |
| UI (lean) | Portal suggestion slot; sales detail related packages; Concierge deep-link chips + Find vehicles quick action |

**Acceptance:** Viewing/saving a motorcycle surfaces `vehicle-registration` (and related finder/license packages). No invented insurance slug — registration covers tax/insurance renewals in catalog copy. Concierge can open `/sales/[id]` via `openListingTool` / search deep links. Listing title/description/images/price are never overwritten.

---

## M6 note (branch `agent/m6-unified-dashboards`)

Wave M6 extends the **customer portal home** into a single workspace shell (additive cards/sections — no marketplace redesign):

| Piece | Location |
|-------|----------|
| Section visibility (role + seller gate) | `src/lib/portal/workspace-sections.ts` |
| Portal home shell | `src/app/[locale]/(portal)/portal/page.tsx` — goals, bookings/cases, saved/compare, docs, invoices + M5 recommendation slot |
| Buyer hub discoverability | Quick links + sidebar (`/portal/saved`, `/portal/goals`) |
| Seller analytics stub | `src/data-access/seller-analytics.ts` + `SellerAnalyticsStub` (ListingView counts when user owns listings) |
| Role redirects | Freelancer → `/portal/freelancer`, company → `/portal/company` (unchanged) |

Listing cuid URLs and description fields are never rewritten. Unit tests: `tests/unit/portal-workspace-sections.test.ts`.

