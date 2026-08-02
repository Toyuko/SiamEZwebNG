# Admin Guide — Platform 2.1

Staff-facing surfaces under `/[locale]/admin/`. Requires session + staff/admin role (`requireStaff` in layouts/actions).

Local dev: set `BYPASS_ADMIN_AUTH=true` to skip login (ignored on Vercel prod/preview).

---

## Navigation map

Sidebar groups (`AdminSidebar.tsx`):

### Operations

| Route | Purpose |
|-------|---------|
| `/admin/dashboard` | Overview counters |
| `/admin/service-jobs` | Service job board |
| `/admin/cases` | Case list + workspace |
| `/admin/calendar` | Appointments |
| `/admin/work-queue` | **2.1** Unified pending inbox |

### People

| Route | Purpose |
|-------|---------|
| `/admin/clients` | Customer accounts |
| `/admin/freelancers` | Freelancer verification |
| `/admin/staff` | Staff accounts |

### Catalog

| Route | Purpose |
|-------|---------|
| `/admin/services` | Service definitions |
| `/admin/life-events` | Life event definitions |
| `/admin/workflows` | Workflow templates + runs |
| `/admin/recommendations` | Recommendation graph edges |
| `/admin/sales` | Vehicle inventory |
| `/admin/real-estate` | Property inventory |

### Finance

| Route | Purpose |
|-------|---------|
| `/admin/invoices` | Invoicing |
| `/admin/payments` | Payment review |
| `/admin/documents` | Document library |

### Insights (2.1)

| Route | Purpose |
|-------|---------|
| `/admin/reports` | Legacy aggregates |
| `/admin/staff-activity` | Assignments + recent case notes |
| `/admin/analytics` | Platform metrics dashboard |
| `/admin/feature-flags` | Runtime toggles |

---

## Work queue

**Route:** `/admin/work-queue`  
**Engine:** `src/lib/admin/work-queue.ts`

Aggregates pending items across domains:

| Kind | Source |
|------|--------|
| `payment` | Submitted payments |
| `workflow_approval` | Steps awaiting staff approval |
| `freelancer` | Pending verification profiles |
| `company` | Unverified companies |
| `listing_enquiry` | New marketplace enquiries |

Sorted by age (hours). Links to relevant admin page.

---

## Staff activity

**Route:** `/admin/staff-activity`

- Case assignment counts by staff (`StaffAssignment.groupBy`)
- Recent case notes with author

Uses shared `EmptyState` component when no data.

---

## Analytics

**Route:** `/admin/analytics`  
**Engine:** `src/lib/analytics/platform-metrics.ts`

30-day metrics:

- Marketplace views (7d/30d), enquiries, published listing count
- Case funnel (created vs paid-ish)
- Workflow completion rate
- Approved revenue sum
- `PlatformMetricEvent` breakdown by kind

**CSV export:** `GET /api/admin/analytics/export` (staff session required).

Event tracking helper: `trackPlatformEvent(kind, meta?, userId?, locale?)` in `src/lib/analytics/track.ts`.

---

## Feature flags

**Route:** `/admin/feature-flags`  
**Engine:** `src/lib/feature-flags.ts`

Default keys:

| Key | Default | Typical use |
|-----|---------|-------------|
| `experimental_ai` | false | LLM-heavy Concierge experiments |
| `marketplace_beta` | true | Saved searches section on portal |
| `new_workflows` | false | Unreleased workflow templates |
| `beta_analytics` | false | Experimental dashboards |

Toggle via Server Action `setFeatureFlagAction`. 30-second in-memory cache on reads.

Check in code: `await isFeatureEnabled("marketplace_beta")`.

---

## Life events

**Routes:** `/admin/life-events`, `/admin/life-events/new`, `/admin/life-events/[id]`

CRUD for configurable customer journeys. Seed example: `moving-to-thailand`.

Customer progress visible at `/portal/goals`. REST bridge at `/api/v1/life-events/**`.

---

## Workflows

**Routes:**

- `/admin/workflows` — template list
- `/admin/workflows/new`, `/admin/workflows/[id]` — edit
- `/admin/workflows/approvals` — pending approval steps

Customer runs at `/portal/workflows`. See [WORKFLOWS.md](./WORKFLOWS.md).

---

## Recommendations

**Route:** `/admin/recommendations`

Manage `RecommendationEdge` rows — source/target pairs with optional `reason` text consumed by Concierge recommend tool and portal slots.

Fallback graph: `src/config/recommendation-graph.ts`.

---

## Reports

**Route:** `/admin/reports`

Pre-2.1 aggregate page. Prefer `/admin/analytics` for operational metrics; reports retained for historical dashboards.

---

## Case workspace

**Route:** `/admin/cases/[id]`

- Timeline, notes, documents, invoices, payments
- AI case summary panel (rule-based, no external API): `src/lib/admin/case-summary.ts`
- Staff assignments
- Bottleneck hints via `getBottlenecks()` (aging cases + pending workflow steps)

---

## Bottleneck detection

**Engine:** `src/lib/admin/bottlenecks.ts`

Surfaces:

- Cases stuck in non-terminal status beyond N days
- Workflow steps pending beyond cutoff

Used in case workspace / staff tooling (not a standalone page).

---

## UX (Phase 4)

- Admin `loading.tsx` and `error.tsx` at `(admin)` layout level
- Shared `EmptyState` on work queue, staff activity
- Admin mobile nav still limited — sidebar not drawer-based

---

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [WORKFLOWS.md](./WORKFLOWS.md)
- [../PLATFORM-2.1-SECURITY.md](../PLATFORM-2.1-SECURITY.md)
