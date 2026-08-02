# SiamEZ Platform 2.1 — Phase 1 Health Audit

**Date:** 2026-08-02  
**Baseline:** Platform 2.0 M0–M7 complete on `siamez-2.0`  
**Scope:** Read-only verification of implemented features (Phase 1)  
**Phases 2–8 status:** **Shipped** (2026-08-02)  
**Phase 9 (docs):** **Complete** — guides under `docs/siamez-2.0/guides/`

---

## Phase 2 — Intelligence (shipped)

| Capability | Implementation |
|------------|----------------|
| Journey memory | `src/lib/ai/journey-context.ts` + client `ConciergeSession.journey` (localStorage) passed to `requestConciergeReply` |
| Goal-change detection | `updateJourneyContext` → `GoalChangeSignal`; announced in reply via `adaptConciergeReply` |
| Recommend next actions | “Suggested next actions” block + engine chips/links |
| Explain recommendations | Configurable `reason` from `RecommendationEdge` / rules shown in reply + service/deep-link chips |
| Adapt from history | Signed-in load via `loadRecommendationContext` (engagement, goals, bookings) + journey framing |
| Listings + services together | Unified search deep links + engine suggestions (unchanged contract) |
| Configurable (not hard-coded) | Admin/DB edges via `loadRecommendationEdges` injected into Concierge `recommendTool` |
| Property related packages | `SuggestionSlot` on `/real-estate/[id]` (parity with sales) |

**Tests:** `tests/unit/journey-context.test.ts` + extended recommendations/concierge suites.

---

## Phase 3 — Marketplace Maturity (shipped)

- Saved searches (`SavedSearch`, `/portal/saved`, `src/actions/saved-searches.ts`)
- Listing badges: new / featured / reduced / verified (`src/lib/marketplace/badges.ts`)
- People-also-viewed + related listings on detail pages
- Seller analytics: views + enquiries per listing (`src/data-access/seller-analytics.ts`)

---

## Phase 4 — Customer Experience (shipped)

- Shared `EmptyState` component; admin + portal `loading.tsx` / `error.tsx`
- Admin work queue empty states; modal/a11y polish (incremental)

---

## Phase 5 — Staff Operations (shipped)

- Unified work queue (`/admin/work-queue`, `src/lib/admin/work-queue.ts`)
- Staff activity dashboard (`/admin/staff-activity`)
- Bottleneck detection (`src/lib/admin/bottlenecks.ts`)
- Rule-based case summaries (`src/lib/admin/case-summary.ts`)

---

## Phase 6 — Analytics (shipped)

- Platform analytics dashboard (`/admin/analytics`, `src/lib/analytics/platform-metrics.ts`)
- Event tracking (`PlatformMetricEvent`, `trackPlatformEvent`)
- CSV export (`GET /api/admin/analytics/export`)

---

## Phase 7 — Feature Flags (shipped)

- DB-backed `FeatureFlag` model + admin UI (`/admin/feature-flags`)
- `isFeatureEnabled()` with 30s cache; defaults for AI, marketplace, workflows, analytics

---

## Phase 8 — Security (shipped)

- In-memory rate limits on login, contact, upload (`src/lib/security/rate-limit.ts`)
- Magic-byte sniff on general uploads (`src/lib/security/magic-bytes.ts`)
- Admin bypass hardening (`src/lib/auth/admin-bypass.ts`)
- Security review doc: [PLATFORM-2.1-SECURITY.md](./PLATFORM-2.1-SECURITY.md)

---

## Executive verdict

Platform 2.0 is **operational**. Core engines (Concierge, marketplaces, services, workflows, life events, goals, recommendations, search, auth, customer portal) are wired end-to-end on web. Maturity gaps concentrate in seller/buyer analytics depth, persistent notifications, feature flags, rate limiting/observability, search index performance, and staff BI/export.

| Rating | Count | Features |
|--------|------:|----------|
| **Complete** | 12 | AI Concierge, Automotive, Property, Professional Services, Workflow Engine, Life Events, Goals, Recommendations, Customer Dashboard, Universal Search, Authentication, **Feature Flags** |
| **Needs Improvement** | 5 | Seller Dashboard (partial analytics), Buyer Dashboard (no alerts pipeline), Notifications, Mobile sync, APIs |
| **Missing** | 0 product systems | — |

---

## 1. Platform Audit Report — Feature matrix

For each feature: status, evidence, technical debt, performance.

### 1.1 AI Concierge — **Complete**

| | |
|--|--|
| **Evidence** | `src/components/ai/**`, `src/lib/ai/**`, `POST /api/v1/concierge/chat`, mounted on public + portal layouts; tests `ai-concierge.test.ts`, `concierge-orchestration.test.ts` |
| **Wired** | Rule replies without LLM; Fuse/unified search tools; recommend tool; open-link (cuid URLs); escalate WhatsApp/LINE; auth-gated start life-event / workflow |
| **Degrades** | No `OPENAI_API_KEY` / AI Gateway → local/rule mode |
| **Debt** | Chat history is **client localStorage**, not server-persisted; API Bearer path may not inject full web-session orchestration context; streaming helpers exist but primary path is request/response |
| **Performance** | Lazy-loaded `ssr: false` (good LCP); marketplace intent can reload unified search corpus per message |
| **2.1 gap vs mission** | Journey memory across sessions, goal-change detection, explained recommendations, history-adaptive replies need Phase 2 work |

### 1.2 Automotive Marketplace — **Complete**

| | |
|--|--|
| **Evidence** | `/[locale]/sales`, `/sales/[id]`, `/portal/sales`, `/admin/sales`, `SalesVehicle`, `ListingEnhancement`, `/api/v1/marketplace/vehicles` |
| **Wired** | Browse/filter, cuid URLs, boost/featured carousel, save/compare/view, enquiries, SEO enhancement, related packages via `SuggestionSlot` |
| **Debt** | Portal reuses admin dashboard client; dual inventory helpers |
| **Performance** | Search index caps vehicles at 200; view write on detail mount |
| **2.1 gap** | Saved searches, people-also-viewed, rich badges (New/Reduced/Verified), listing performance analytics beyond views |

### 1.3 Property Marketplace — **Complete**

| | |
|--|--|
| **Evidence** | `/real-estate`, `/real-estate/[id]`, portal + admin, `SalesProperty`, `/api/v1/marketplace/properties` |
| **Wired** | Same engagement stack as automotive; featured boost carousel |
| **Gap vs auto** | **Resolved (2.1)** — property detail now has `SuggestionSlot` |
| **Debt / perf** | Same as automotive; no map lat/lng productization |

### 1.4 Professional Services — **Complete**

| | |
|--|--|
| **Evidence** | `/services`, `/book/[service-slug]` → `WizardEngine`, 13 wizard configs, `submitBooking` → Case |
| **Wired** | JSON-driven booking; freelancer/company job surfaces |
| **Debt** | Dual `Job` / `MarketplaceJob`; OCR extract stub; deprecated specialty wizards still in tree |
| **Performance** | Book page dynamic-imports WizardEngine |

### 1.5 Universal Workflow Engine — **Complete**

| | |
|--|--|
| **Evidence** | `WorkflowTemplate*` / `WorkflowRun*` models, `src/lib/workflows/**`, `/admin/workflows`, `/portal/workflows`, seed templates for inspection + viewing |
| **Wired** | Admin CRUD, customer start/advance, staff approve/reject, `linkedCaseId` after booking |
| **Stub** | AI next-step polish without LLM; **no** `/api/v1` workflow **run** APIs (templates list only) |
| **Debt** | Mobile cannot manage runs via REST |

### 1.6 Life Events Engine — **Complete**

| | |
|--|--|
| **Evidence** | `LifeEvent*` models, admin CRUD, `/portal/goals`, `/api/v1/life-events/**`, seed `moving-to-thailand` |
| **Wired** | Configurable definitions + customer progress + Concierge start intent |
| **Debt** | One run per user+event (`@@unique`); step targets are flexible JSON |

### 1.7 Goals Engine — **Complete**

| | |
|--|--|
| **Evidence** | `Goal` model, `src/lib/goals/**`, portal + `/api/v1/goals`, sync from life events |
| **Wired** | CRUD + progress helpers |
| **Debt** | Colocated with life-events UI; progress % sometimes manual |

### 1.8 Recommendation Engine — **Complete**

| | |
|--|--|
| **Evidence** | `src/lib/recommendations/**`, `RecommendationEdge`, `/admin/recommendations`, `GET /api/v1/recommendations`, Concierge recommend tool |
| **Wired** | Deterministic rules from engagement/goals/bookings; admin-configurable edges; reason polish optional |
| **Debt** | Property detail missing related slot; not collaborative filtering / embeddings |
| **2.1 gap** | Stronger “why” explanations in UX; ensure all surfaces consume configurable graph (not hard-coded catalog-only paths) |

### 1.9 Customer Dashboard — **Complete**

| | |
|--|--|
| **Evidence** | `/portal` workspace sections: goals, bookings, saved, docs, invoices, recommendations |
| **Debt** | Home fans out many parallel queries; activity feed ≠ notification store |
| **Performance** | Hot path; largely uncached / force-dynamic |

### 1.10 Seller Dashboard — **Needs Improvement** (improved 2.1)

| | |
|--|--|
| **Evidence** | `/portal/sales`, `/portal/real-estate`, `getSellerListingViewStats` — views + enquiries per listing |
| **Wired** | Listing manage, enquiry inbox, per-listing view/enquiry counts |
| **Missing** | Funnel, conversion, impressions time-series, revenue analytics |
| **Debt** | Admin UI reuse in portal; no time-series charts |

### 1.11 Buyer Dashboard — **Needs Improvement** (improved 2.1)

| | |
|--|--|
| **Evidence** | Hub at `/portal/saved` — saved + compare + recent + **saved searches** (feature-flagged) |
| **Wired** | Save/unsave, compare ≤3, recent views, saved searches (max 20), anon→user cookie merge |
| **Missing** | Dedicated buyer shell, search **alerts**, purchase/offer pipeline |

### 1.12 Universal Search — **Complete**

| | |
|--|--|
| **Evidence** | `src/lib/search/**`, header ⌘K palette, Concierge tool, `GET /api/v1/search` |
| **Wired** | Grouped services / vehicles / properties / help stubs; deep links preserve contracts |
| **Debt** | Help stubs not CMS; service palette still separate on `/services` |
| **Performance** | **Major:** rebuilds Fuse corpus (DB pull, ≤200 listings each type) **per request**, no cache |

### 1.13 Authentication — **Complete**

| | |
|--|--|
| **Evidence** | Auth.js v5 credentials + optional Google/Facebook/LINE; conversational register; mobile JWT; role gates |
| **Debt** | Hybrid cookie vs Bearer; `allowDangerousEmailAccountLinking`; session callback DB hit; middleware cookie-presence for portal/admin |
| **Caveat** | `BYPASS_ADMIN_AUTH` blocked on Vercel prod/preview + `NODE_ENV=production` |

### 1.14 Notifications — **Needs Improvement**

| | |
|--|--|
| **Evidence** | `/portal/notifications` = derived activity; prefs JSON on User; Expo push for some job/chat events |
| **Missing** | `Notification` model, read/unread, email pipeline, marketplace/enquiry push |
| **Debt** | Naming oversells “notifications” |

### 1.15 Mobile synchronization — **Needs Improvement**

| | |
|--|--|
| **Evidence** | `docs/siamez-2.0/MOBILE-API-V1.md`; `/api/v1/*` adapters for marketplace, goals, LE, search, recs, concierge, workflow-templates |
| **Wired** | Online REST bridge for engines |
| **Missing** | Offline queue, delta sync, ETags, conflict resolution; workflow **run** APIs |
| **Debt** | Contract map incomplete vs actual routes |

### 1.16 APIs — **Needs Improvement**

| | |
|--|--|
| **Evidence** | Hybrid Server Actions + REST; 19+ `/api/v1/**` routes; `api-contracts.ts` scaffold |
| **Missing** | Full OpenAPI; uniform Zod on all mutating routes; caching strategy |
| **Debt** | Dual maintenance surface; historical upload auth residual (unassigned uploads still allowed) |

---

## 2. Technical Debt Report

| Priority | Debt | Area |
|----------|------|------|
| P0 | ~~No rate limiting on public auth/contact/upload~~ **Resolved (2.1 P8)** — in-memory limiter; needs Redis for prod | Security |
| P0 | No error tracking / APM (console-only) | Reliability |
| P1 | Search corpus rebuilt per query (no cache/index) | Performance |
| P1 | Notifications are activity-derived, not persisted | Product |
| P1 | Workflow runs not on mobile `/api/v1` | Mobile parity |
| P1 | Seller analytics stub | Marketplace |
| P2 | ~~Property detail missing related-package `SuggestionSlot`~~ **Resolved (2.1 P2/P3)** | Recs |
| P2 | Portal ↔ admin sales/RE client coupling | UX / ownership |
| P2 | Dual Job / MarketplaceJob models | Domain |
| P2 | Deprecated specialty wizards still in tree | Cleanup |
| P2 | ~~`ARCHITECTURE.md` still mentions MySQL~~ **Resolved (2.1 P9)** — see [guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md) | Docs |
| P2 | OAuth `allowDangerousEmailAccountLinking` | Security |
| P3 | ~~Public blob URLs without magic-byte sniffing~~ **Partial (2.1 P8)** — general upload only | Uploads |
| P3 | Admin colocated giant clients | Maintainability |
| P3 | Help centre search stubs not CMS | Content |
| P3 | ~~No runtime feature flags~~ **Resolved (2.1 P7)** | Ops |

---

## 3. Performance Report

| Hot path | Issue | Impact | Recommended direction (Phase 2+) |
|----------|-------|--------|----------------------------------|
| `loadSearchDocuments` | Full DB pull + Fuse rebuild per search / Concierge marketplace intent | Latency under load; mobile polling costly | Cache corpus (tag/TTL) or external index |
| Portal home | Many parallel queries (cases, invoices, docs, jobs, hubs, recs, seller) | Slow TTFB for logged-in customers | Parallelize carefully + selective caching / streaming |
| Auth session callback | DB hit every session read | Auth latency | Cache role/status or shorten JWT claims carefully |
| Listing detail | View write on mount | Write amplification | Debounce / batch / sample |
| Admin reports | Multiple `groupBy` without cache | Ops page lag | Materialize daily metrics |
| Bundle | Concierge + WizardEngine already lazy (P7) | Good | Keep additive features lazy |

**Already good:** Concierge shell lazy `ssr: false`; WizardEngine dynamic import; middleware JWT limited to specific API prefixes.

---

## 4. Security Review

| Control | Status | Notes |
|---------|--------|-------|
| Authentication | **Complete** | Auth.js + bcrypt; inactive reject; mobile JWT helpers |
| Authorization | **Needs Improvement** | Strong helpers (`requireStaff`, etc.); middleware is cookie-presence, not role verify |
| API permissions | **Needs Improvement** | Many v1 routes auth’d; uneven Zod; residual open upload edge cases |
| Rate limiting | **Needs Improvement** | In-memory on login/contact/upload; not distributed |
| File upload validation | **Needs Improvement** | MIME/size + magic-byte on general upload; chat/tracking MIME only |
| Input validation | **Needs Improvement** | Strong on booking/env; uneven elsewhere |
| Error logging | **Needs Improvement** | `console.error` only |
| Monitoring | **Missing** | No Sentry/OTel |
| Backup strategy | **Missing** (docs) | Neon implied; DR runbook in [PLATFORM-2.1-SECURITY.md](./PLATFORM-2.1-SECURITY.md) |

**Phase 8 delivered:** rate limits, magic-byte sniff (partial), admin bypass guards. See [PLATFORM-2.1-SECURITY.md](./PLATFORM-2.1-SECURITY.md) for full review.

---

## 5. UX Review

| Dimension | Status | Notes |
|-----------|--------|-------|
| Loading states | **Needs Improvement** | Public + portal `loading.tsx`; **no** admin `loading.tsx`; Skeleton underused |
| Empty states | **Needs Improvement** | Ad-hoc strings; no shared EmptyState kit for admin |
| Error handling | **Needs Improvement** | Public/portal `error.tsx`; **no** admin `error.tsx` |
| Animation | **Needs Improvement** | Strong on wizard/concierge/marketing; admin mostly spinners |
| Mobile responsiveness | **Needs Improvement** | Portal drawer OK; admin sticky sidebar cramped (no mobile drawer) |
| Accessibility | **Needs Improvement** | Partial aria; modal lacks focus trap / restore |
| Navigation consistency | **Needs Improvement** | Three shells (public / portal / admin); buyer not first-class |

---

## 6. Marketplace Review

| Capability | Auto | Property | Notes |
|------------|------|----------|-------|
| Browse + filters | ✅ | ✅ | Preserve cuid URLs |
| Featured / boosted | ✅ | ✅ | Carousel + homepage |
| Saved listings | ✅ | ✅ | `SavedListing` |
| Recently viewed | ✅ | ✅ | `ListingView` capped |
| Compare | ✅ | ✅ | ≤3 mix allowed |
| Enquiries | ✅ | ✅ | `ListingEnquiry` + `/portal/enquiries` |
| Related packages | ✅ | ✅ | Property parity via `SuggestionSlot` |
| SEO enhancement | ✅ | ✅ | `ListingEnhancement` |
| Saved searches | ✅ | ✅ | Phase 3 — `SavedSearch`, `/portal/saved` |
| People also viewed | ✅ | ✅ | Phase 3 — co-view from `ListingView` |
| Listing performance analytics | Partial | Partial | Views + enquiries per listing (not full funnel) |
| Badges (New / Featured / Reduced / Verified) | ✅ | ✅ | Phase 3 — `computeListingBadges` |
| Favorites sync | Partial | Partial | Web + v1 saved; no offline sync |
| Better filter/sort | Partial | Partial | Basic filters; deepen in Phase 3 |

**Preserve rule:** Do not remove existing listings or `/sales/[id]` / `/real-estate/[id]` cuid URLs.

---

## 7. AI Concierge Review

| Mission capability (Phase 2) | Current state |
|------------------------------|---------------|
| Remember context throughout journey | **Present (2.1)** — session journey snapshot + server merge; not yet cross-device DB table |
| Detect goal changes | **Present (2.1)** — topic/goal pivot detection with reply notice |
| Recommend next actions | **Present** — next-actions block + recommend tool + portal/listing slots |
| Explain why recommendations | **Present (2.1)** — reasons in reply text + chips (graph-driven) |
| Adapt from customer history | **Present (2.1)** — signed-in engagement/goals/bookings hydrate Concierge |
| Suggest listings + services together | **Present** — unified search + typed suggestions |
| Configurable (not hard-coded) | **Present** — `RecommendationEdge` + admin graph injected into Concierge |

**Verdict:** Phase 2 intelligence layer is live. Remaining polish: optional server-persisted journey table for cross-device sync (Phase 3+/7).

---

## 8. Cross-cutting systems (Phases 5–8 — shipped)

| System | Status | Evidence |
|--------|--------|----------|
| Staff work queue | **Complete (basic)** | `/admin/work-queue`, `getWorkQueue()` |
| AI customer summaries | **Needs Improvement** | Rule stub `src/lib/admin/case-summary.ts` |
| Task assignments | **Complete (basic)** | `StaffAssignment` + case UI |
| Bottleneck detection | **Complete (basic)** | `src/lib/admin/bottlenecks.ts` |
| Staff activity dashboard | **Complete (basic)** | `/admin/staff-activity` |
| BI dashboards + export | **Complete (basic)** | `/admin/analytics` + CSV export |
| Feature flags | **Complete** | `/admin/feature-flags`, `FeatureFlag` model |
| Documentation | **Complete** | Guides under `docs/siamez-2.0/guides/` (Phase 9) |

---

## 9. Implementation order — status

| Phase | Focus | Status |
|-------|-------|--------|
| **1** | Health audit | ✅ Complete |
| **2** | Intelligence | ✅ Shipped |
| **3** | Marketplace | ✅ Shipped |
| **4** | CX | ✅ Shipped |
| **5** | Staff | ✅ Shipped |
| **6** | Analytics | ✅ Shipped |
| **7** | Feature flags | ✅ Shipped |
| **8** | Security | ✅ Shipped |
| **9** | Docs | ✅ Complete — see [guides/](./guides/) |

---

## 10. Acceptance

- [x] Every major feature inventoried with evidence paths  
- [x] Status assigned: Complete / Needs Improvement / Missing  
- [x] Technical debt and performance called out  
- [x] Security, UX, Marketplace, Concierge reviews produced  
- [x] Phases 2–8 shipped; Phase 9 documentation complete  

**Platform 2.1 gate:** All phases complete. Remaining gaps tracked in [PLATFORM-2.1-SECURITY.md](./PLATFORM-2.1-SECURITY.md) and Needs Improvement rows above.
