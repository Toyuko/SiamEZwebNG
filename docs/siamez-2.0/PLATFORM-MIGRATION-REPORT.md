# SiamEZ Platform 2.0 — Content & Marketplace Migration Report

**Status:** Audit complete · **Code modified:** None  
**Branch:** `siamez-2.0`  
**Date:** 2026-08-02  
**Mandate:** Preserve every valuable asset. Enhance in place. Never delete unless confirmed obsolete.

---

## 1. Executive verdict

SiamEZ already operates as **one Next.js app** with shared auth, cases, concierge, and portal—not separate sites. Professional services are modernized (WizardEngine × 13). Vehicle (`/sales`) and real-estate (`/real-estate`) marketplaces are **parallel listing systems** with solid Prisma models and seller/admin CRUD.

**What is missing** is the orchestration layer: Life Events, Goals, unified cross-domain search, personalized recommendations, and a general workflow engine that spans divisions. Those should be **additive layers** on top of Case + `SalesVehicle` + `SalesProperty`—not replacements.

---

## 2. Content inventory (preserve)

| Asset | Status | Canonical paths / notes |
|-------|--------|-------------------------|
| **Vehicle listings** | Live model + UI | Prisma `SalesVehicle`; `/[locale]/sales`, `/sales/[cuid]`; ~37 seed rows (motorcycle-heavy) |
| **Property listings** | Live model + UI | Prisma `SalesProperty`; `/[locale]/real-estate`, `/real-estate/[cuid]` |
| **Listing images/videos** | Live | Blob uploads + remote URLs; `imageUrls`/`videoUrls` JSON; hero media |
| **Professional services** | Modernized | 13 slugs; WizardEngine; Case pipeline |
| **Bookings / cases** | Core | `submitBooking` → `createBookingCase`; invoices/payments/docs |
| **Customer accounts** | Live | Auth.js roles; portal; first-run onboarding |
| **Documents** | Live + OCR stubs | Case-linked; wizard `documentIds` |
| **SEO marketing pages** | Live | Home, about, contact, services/[slug], gallery, testimonials, legal |
| **Gallery / testimonials** | Static content | `config/gallery.ts`, `src/content/*-testimonials.ts` |
| **Blog** | **Absent** | No routes/models — do not invent deletion; greenfield later |
| **Categories / tags** | Partial | Vehicle category + RE propertyType/listingType; service catalog categories |
| **Search** | Split | Fuse/cmdk = **services only**; sales/RE = server filters |
| **Navigation** | Unified header | `site.ts`: Services group includes `/services`, `/sales`, `/real-estate`, `/freelancers` |
| **AI Concierge** | Live | Catalog/rules (+ optional LLM); booking handoff only |
| **Notifications** | Thin inbox | Activity-derived; Expo prefs exist |
| **Freelancer / company** | Live | Separate portal surfaces — preserve |

### Obsolete candidates (do **not** delete yet)

| Item | Reason to wait |
|------|----------------|
| `components/booking/*BookingWizard.tsx` | Deprecated; delete only after Orchestrator sign-off |
| `iron-session` helper | Unused; confirm no mobile client dependency |
| Legacy `/booking/*` redirect routes | Keep for SEO/bookmarks |

---

## 3. URL contracts (must remain functional)

```
/[locale]/sales
/[locale]/sales/[cuid]          ← id is cuid, NOT slug
/[locale]/real-estate
/[locale]/real-estate/[cuid]
/[locale]/portal/sales
/[locale]/portal/real-estate
/[locale]/admin/sales
/[locale]/admin/real-estate
/[locale]/services
/[locale]/services/[slug]
/[locale]/book/[service-slug]
/[locale]/portal/**
```

**Sales list query contract:** `category`, `seller`, `search`, `sort`, `page`, `pageSize`, `minPrice`, `maxPrice`, `minYear`, `maxYear`, `?openBoost=`

**RE list query contract:** `type`, `listing`, `seller`, `search`, `province`, `sort`, `page`, `pageSize`, `minBeds`, `minPrice`, `maxPrice`, `minArea`

**Enhancement rule:** Prefer additive query params and optional slug aliases with **301/rewrite from cuid** if slug URLs are introduced later. Never break cuid detail links.

---

## 4. Domain models to keep vs add

### KEEP (evolve columns only)

- `SalesVehicle`, `SalesProperty` (+ shared status/seller/boost enums)
- `Service`, `Case`, `Quote`, `Invoice`, `Payment`, `Document`
- `User` + role model
- Wizard configs under `src/config/wizards/**`

### ADD (new layers — do not fork listings)

| Model / module | Purpose |
|----------------|---------|
| `LifeEventDefinition` + instance | Configurable multi-division journeys |
| `Goal` / `GoalDefinition` | Intent → life event / workflow |
| `SavedListing` / `ListingView` / `CompareSet` | Marketplace engagement |
| `RecommendationEvent` or scoring views | Data-driven recs |
| `WorkflowTemplate` / `WorkflowRun` | Cross-division orchestration (Case remains booking spine) |
| Search index / projection | Unified search documents |
| Listing enhancement cache | AI summary, SEO meta (nullable columns or side table) |

**Migration Engine rule:** Write enhancements to **new fields/tables** or side caches. Never overwrite title/description/images/price unless an admin explicitly opts in.

---

## 5. Gap analysis vs Platform 2.0 brief

| Capability | Today | Target |
|------------|-------|--------|
| Automotive marketplace | Inventory + boost + filters | + AI summary, saved/compare, packages, ownership cost, analytics, SEO |
| RE marketplace | Inventory + filters (boost weaker than sales) | + viewing booking, saved, legal/translation links, map-ready, SEO |
| Professional services | Wizard + Case | Wire into Life Events / Goals; keep wizards |
| Life Events Engine | Missing | Admin-configurable graphs |
| Goals Engine | Missing | Intent → event → workflow |
| Recommendation Engine | Popular Fuse only | Activity + goals + listings + bookings |
| Universal Workflow | Wizard + Case only | Templates spanning divisions |
| Concierge | Services → book | Intent → divisions → listings → events |
| Unified Search | Split | One bar, typed result groups |
| Customer dashboard | Cases/next-steps | Goals, saved listings, life events, etc. |
| Seller / buyer dashboards | Portal sales/RE CRUD | Analytics, offers, AI pricing (additive) |
| Blog / KB | Missing | Later content division |

---

## 6. Migration Engine (specification — not yet built)

Responsibilities:

1. **Analyze** — inventory listings, media, services, cases  
2. **Preserve** — snapshot/export before transforms  
3. **Normalize** — specs JSON, media URLs, locales  
4. **Transform** — project into enhancement tables / search docs  
5. **Enhance** — AI summary/SEO (idempotent, non-destructive)  
6. **Report** — per-run CSV/MD of touched IDs  
7. **Rollback** — keep previous enhancement versions; never delete source rows  

Suggested location (when approved): `src/lib/migration/**` + `scripts/migrate-platform-*.ts` + `docs/siamez-2.0/migrations/`.

---

## 7. Architectural decisions (locked for this phase)

1. **One app, many divisions** — extend `site.ts` nav; no microsites.  
2. **Case remains the booking ledger** — workflows may *reference* cases, not replace them.  
3. **Listings remain `SalesVehicle` / `SalesProperty`** — enhance; do not rename tables in v1.  
4. **Concierge orchestrates** — new engines expose tools; Concierge does not own data.  
5. **SEO first** — add per-listing metadata + sitemap entries before URL shape changes.  
6. **Reuse before invent** — WizardEngine, Fuse patterns, portal next-steps, boost packages.  

---

## 8. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking `/sales/[cuid]` | Critical | Freeze public ID contract; tests for redirects |
| Overwriting listing copy with AI | High | Side-table / nullable `aiSummary`; human override |
| Dual Job vs MarketplaceJob confusion | Med | Document; don’t add a third job type |
| Service catalog multi-SSOT drift | Med | Unify before Life Event graphs |
| Personalized recs without events | Med | Start rule+activity; ML later |
| Scope explosion | High | Phased delivery; approve each wave |

---

## 9. Recommended delivery waves (summary)

See [PLATFORM-ROADMAP.md](./PLATFORM-ROADMAP.md).

| Wave | Focus |
|------|-------|
| M0 | Freeze inventory + migration reports tooling |
| M1 | Listing SEO + AI enhancement side-fields (non-destructive) |
| M2 | Saved / recently viewed / compare |
| M3 | Unified Search index |
| M4 | Goals + Life Events engines (config-driven) |
| M5 | Recommendation + Concierge tools across divisions |
| M6 | Unified customer / seller / buyer dashboards |
| M7 | Cross-division Workflow templates |

---

## 10. Success criteria mapping

| Criterion | Path |
|-----------|------|
| Vehicle listings preserved & enhanced | Keep `SalesVehicle` + M1/M2 |
| Property listings preserved & enhanced | Keep `SalesProperty` + M1/M2 |
| Services modernized | Done (WizardEngine); wire to M4/M5 |
| Concierge orchestrates platform | M5 |
| Life Events / Goals | M4 |
| Universal workflow | M7 (build on Wizard + Case) |
| Recommendations | M5 |
| Unified dashboards | M6 |
| Shared architecture for app | API contracts + engines from M0 onward |

**Awaiting approval** to implement M0 (Migration Engine scaffolding + freeze tests) without changing listing UX.