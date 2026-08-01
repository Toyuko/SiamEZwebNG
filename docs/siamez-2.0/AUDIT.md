# SiamEZ 2.0 — Repository Audit

**Status:** Complete · **Code modified:** None  
**Date:** 2026-08-01  
**Repo:** https://github.com/Toyuko/SiamEZwebNG

Companion visual: Cursor canvas `siamez-2-phase1-analysis` and `siamez-2-orchestrator`.

---

## 1. Architecture Report

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js **16.1** App Router, React **18.3**, TypeScript |
| DB | PostgreSQL via Prisma **6** (`DATABASE_URL` + `DIRECT_URL`) |
| Auth | Auth.js / NextAuth **v5** JWT sessions; separate Bearer JWT for mobile APIs |
| i18n | next-intl (`en`, `th`), locale-prefixed routes |
| Payments | Stripe, PromptPay QR, Omise webhooks |
| Storage | Vercel Blob (`mock://` fallback without token) |
| Realtime | Pusher (job chat/tracking) |
| UI | Tailwind 3.4, CVA, Lucide, cmdk; hand-rolled shadcn-style primitives |
| Validation | Zod (no React Hook Form today) |
| AI | **None** (Web Speech API + Fuse.js search only) |

### Source layout (preserve)

```
src/app/          → RSC routes + API handlers
src/actions/      → Server Actions
src/lib/domain/   → Business rules
src/data-access/  → Prisma wrappers
src/components/   → UI by domain
src/config/       → Service / payment catalogs
messages/         → i18n catalogs
prisma/           → Schema, migrations, seed
```

### Route surfaces

| Surface | Path pattern | Notes |
|---------|--------------|-------|
| Public | `/[locale]/(public)/*` | Marketing, SEO, service directory |
| Auth | `/[locale]/(auth)/login\|register` | Credentials + optional OAuth |
| Booking | `/[locale]/book/[service-slug]` | Canonical wizard entry |
| Legacy | `/[locale]/booking/*` | Redirects to `/book` |
| Checkout | `/[locale]/checkout/[caseId]` | Session or guest `?token=` |
| Portal | `/[locale]/(portal)/portal/*` | Customer / freelancer / company |
| Admin | `/[locale]/(admin)/admin/*` | Ops, finance, catalog, calendar |
| API | `/api/*` | Mobile JWT, webhooks, chat, uploads |

### Domain core (keep)

```
User ──< Case >── Service
         ├── Quote[]
         ├── Invoice[] ── Payment[]
         ├── Document[]
         ├── StaffAssignment[], CaseNote[]
         └── MarketplaceJob? → Freelancer
```

**Booking pipeline (stable):**  
service → wizard → `submitBooking` → `createBookingCase` → Case (+ Invoice if fixed) → checkout or quote confirmation.

### Roles

`admin` | `staff` | `customer` | `freelancer` | `company`

### Verdict

The platform already has a correct **Case-centric domain** and layered architecture. The modernization gap is **UX orchestration** (hard-coded wizards → conversational/JSON engine, browse-first → concierge-first) and **security hardening** before AI tools can mutate data — not a missing backend.

---

## 2. Component Inventory

### Counts (approximate)

| Area | Location | Count |
|------|----------|------:|
| Shared components | `src/components/**` | ~92 |
| App-colocated clients | `src/app/**` (esp. admin) | ~73 |
| UI primitives | `src/components/ui/` | 9 |
| Booking wizards | `src/components/booking/` | 4 (~588–727 LOC each) |
| `"use client"` share | components | ~66/92 |

### UI primitives present

`button`, `card`, `input`, `label`, `select`, `modal`, `dropdown-menu`, `command`, `stepper`, `toast`

### Feature domains

Public sections, services directory, portal shell, layout sidebars, booking wizards, client job tracking, freelancer feed, company dashboard, sales/RE, checkout/payments, jobs/chat, theme.

### Duplication hotspots

1. Four near-copy booking wizards  
2. Three service grids (`ServiceGrid`, `ServicesGrid`, `ServiceDirectoryGrid`)  
3. Parallel sales vs real-estate listing modals (~780–805 LOC)  
4. Dual invoice detail clients (admin + portal)  
5. `payment/` vs `payments/` folder split  
6. Service metadata across `services.ts`, `service-catalog.ts`, `service-search.ts`, seed, and detail pages

### Services (13 seeded)

| Slug | Special UI |
|------|------------|
| `driver-license` | Dedicated wizard + tracking steps |
| `car-motorbike-finder-selling-service` | Dedicated wizard |
| `real-estate-services` | Dedicated wizard |
| `vehicle-registration` | Generic wizard + tracking steps |
| `marriage-registration`, `translation-services`, `police-clearance`, `visa-services`, `construction-handyman`, `transportation-services`, `private-driver-service`, `event-planning-venue-services` | Generic `BookingWizard` |
| `basic-translation` | Fixed price (500 THB) |

`Service.formConfig` exists in Prisma/types but is **not read at runtime**.

---

## 3. Technical Debt Report

### Critical

| Item | Detail |
|------|--------|
| Unguarded Server Actions | `src/actions/case.ts` lacks auth; many `admin.ts` exports omit `ensureStaffAccess` |
| Open upload | `POST /api/upload` can write Blob without auth (general/sales path) |
| AI expansion blocked | Concierge must not get mutating tools until actions are hardened |

### High

| Item | Detail |
|------|--------|
| MySQL migration leftovers | 5 migrations use backticks; local fresh Postgres needs `db push` + seed |
| Wizard duplication | ~2.7k LOC specialty wizards; formConfig unused |
| Document upload gap | Wizards often pass `documentIds: undefined` |
| Zero automated tests | No unit/e2e suite |
| Stale docs | `docs/ARCHITECTURE.md` still describes MySQL / outdated trees |

### Medium

| Item | Detail |
|------|--------|
| Dual job models | `Job` vs `MarketplaceJob` overlap |
| Service config multi-source | Catalog/seed/page copy drift risk |
| Admin colocated giants | Calendar, listing modals, invoice wizard |
| No notification inbox | Push prefs exist; no portal bell/inbox |
| Reports placeholder | `/admin/reports` thin |
| Caching strategy absent | Mostly `force-dynamic`; no tag cache |
| Lazy loading | Essentially only TrackingMap uses `next/dynamic` |
| Raw `<img>` | Chat, ads, QR, attachments bypass `next/image` |
| Lint debt | ~40 pre-existing errors; CI gate weak |
| Unused iron-session | `src/lib/session.ts` present but unused |

### KEEP / IMPROVE / REPLACE

| Disposition | Examples |
|-------------|----------|
| **KEEP** | NextAuth roles, Prisma Case hub, `createBookingCase`, domain layering, payments, next-intl, portal/admin shells |
| **IMPROVE** | UI kit, service SSOT, portal/admin UX, SEO, session callback DB hits, i18n coverage |
| **REPLACE (UX only)** | Per-service wizards → JSON engine; static register → conversational; browse-only CTA → Concierge |

---

## 4. Reuse seeds for 2.0

Build on: `Stepper`, Zod booking schemas, `submitBooking` / `createBookingCase`, `ServiceCommandPalette`, `useVoiceRecognition`, WhatsApp float → Concierge FAB pattern, `uploadAndCreateDocument`, `ClientDocumentUpload`, checkout/payment actions, theme + locale switchers.

Add beside (not instead): `components/ai`, `lib/ai`, `components/wizard`, Framer Motion, RHF+Zod forms, OCR-ready document pipeline.
