# SiamEZ Platform – Architecture & Folder Structure

## Overview

Single Next.js (App Router) monorepo for the SiamEZ services booking platform. Mobile-first, Vercel-hosted, MySQL + Prisma, Stripe payments, with clear separation of UI, domain logic, data access, and services.

---

## 1. Folder Structure

```
SiamEZwebNG/
├── .env.local                 # Local env (DB, Stripe, Auth secrets)
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── prisma/
│   ├── schema.prisma          # MySQL schema
│   ├── migrations/
│   └── seed.ts                # Seed services + admin
├── public/
│   └── images/
├── docs/
│   └── ARCHITECTURE.md        # This file
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css
│   │   ├── (public)/          # Public marketing site
│   │   │   ├── layout.tsx     # Public header/footer
│   │   │   ├── page.tsx       # Home
│   │   │   ├── services/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── success-stories/page.tsx
│   │   │   └── ...
│   │   ├── (auth)/            # Auth UI (login, register, forgot)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (portal)/          # Customer portal
│   │   │   ├── layout.tsx     # Portal nav/sidebar
│   │   │   ├── portal/
│   │   │   │   ├── page.tsx   # Dashboard
│   │   │   │   ├── cases/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── invoices/page.tsx
│   │   │   │   └── documents/page.tsx
│   │   │   └── book/
│   │   │       └── [serviceSlug]/page.tsx  # Booking wizard entry
│   │   ├── (admin)/           # Admin / Staff dashboard
│   │   │   ├── layout.tsx     # Admin sidebar/nav
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx   # Dashboard
│   │   │   │   ├── services/
│   │   │   │   ├── cases/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── clients/
│   │   │   │   ├── calendar/page.tsx
│   │   │   │   ├── reports/page.tsx
│   │   │   │   └── settings/
│   │   │   └── ...
│   │   ├── api/               # API routes (webhooks, optional REST)
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── stripe/webhook/route.ts
│   │   │   └── upload/route.ts
│   │   └── booking/          # Booking wizard (multi-step)
│   │       └── [serviceSlug]/
│   │           └── page.tsx   # Stepper + steps
│   ├── components/            # Shared & domain UI
│   │   ├── ui/                # Primitives (Button, Card, Input, etc.)
│   │   ├── layout/            # Header, Footer, Sidebar, etc.
│   │   ├── public/            # Public-site specific
│   │   ├── portal/            # Customer portal specific
│   │   ├── admin/             # Admin dashboard specific
│   │   └── booking/           # Wizard steps, summary, document upload
│   ├── lib/                   # Core utilities & config
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # Auth config (NextAuth / custom)
│   │   ├── stripe.ts          # Stripe client
│   │   ├── env.ts             # Validated env
│   │   └── utils.ts
│   ├── domain/                # Domain logic (use cases, rules)
│   │   ├── services/          # Service domain
│   │   ├── cases/             # Case domain
│   │   ├── quotes/            # Quote domain
│   │   ├── payments/          # Payment domain
│   │   └── booking/           # Booking flow domain
│   ├── data-access/           # Data access layer (Prisma wrappers)
│   │   ├── user.ts
│   │   ├── service.ts
│   │   ├── case.ts
│   │   ├── quote.ts
│   │   ├── payment.ts
│   │   ├── document.ts
│   │   └── invoice.ts
│   ├── actions/               # Server Actions (entry points)
│   │   ├── auth.ts
│   │   ├── booking.ts
│   │   ├── case.ts
│   │   ├── quote.ts
│   │   ├── payment.ts
│   │   ├── document.ts
│   │   └── invoice.ts
│   ├── types/                 # Shared TS types
│   │   ├── index.ts
│   │   ├── booking.ts
│   │   └── case.ts
│   └── config/                # App config (nav, service slugs, etc.)
│       ├── site.ts            # Public nav, footer, SEO defaults
│       └── services.ts        # Service slugs, display names
```

---

## 2. Route Groups Summary

| Group     | Purpose                    | Layout              | Auth        |
|----------|----------------------------|---------------------|------------|
| `(public)`  | Marketing: Home, Services, About, Contact, Success Stories | Public header/footer | None       |
| `(auth)`    | Login, Register, Forgot password         | Centered card        | None       |
| `(portal)`  | Customer: dashboard, cases, profile, invoices, book | Portal sidebar/nav   | Customer   |
| `(admin)`   | Admin/Staff: services, cases, clients, calendar, reports | Admin sidebar        | Admin/Staff |
| `booking/`  | Booking wizard (can live under portal or public entry) | Wizard stepper        | Optional (guest or customer) |

---

## 3. Data Flow

- **UI (app/ + components/)** → calls **Server Actions (actions/)** or reads from **data-access/** in RSC.
- **Server Actions** → call **domain/** for rules and **data-access/** for DB.
- **API routes** → used for webhooks (Stripe), file upload, and optional REST; same domain/data-access usage.
- **Prisma** → single `lib/db.ts` client; all DB access via `data-access/` or explicit `lib/db.ts` in actions.

---

## 4. Domain Models (Logical)

- **User** – id, email, name, role (admin | staff | customer), password hash, timestamps.
- **Service** – id, slug, name, description, type (fixed | quote), price (nullable for quote), meta (JSON for dynamic form config), active.
- **Case** – id, userId, serviceId, status (e.g. new, quoted, paid, in_progress, completed, cancelled), source (booking_id), timestamps.
- **Quote** – id, caseId, amount, currency, status (draft, sent, accepted, rejected), validUntil, timestamps.
- **Payment** – id, caseId (or invoiceId), stripePaymentIntentId, amount, currency, status, type (full, deposit, additional), timestamps.
- **Document** – id, caseId, uploadedBy (userId), name, url (or storage key), type (e.g. passport, contract), timestamps.
- **StaffAssignment** – id, caseId, userId (staff), role (primary, support), assignedAt.
- **CaseNote** – id, caseId, userId, content, isInternal, timestamps.
- **Invoice** – id, caseId, quoteId (optional), amount, currency, status (draft, sent, paid, overdue), dueDate, stripeInvoiceId (optional), timestamps.

Booking creates a **Case**; fixed-price creates **Quote** + optional **Payment**; quote-based creates **Case** + **Quote** (draft → sent → accepted) then **Payment**. All stored in MySQL via Prisma.

---

## 5. Key Conventions

- **Server Components by default**; Client Components only where needed (wizard state, modals, real-time).
- **Server Actions** for mutations (booking submit, quote accept, payment, document upload, case update).
- **Edge-friendly**: no direct Prisma on Edge; use Server Actions/API in Node runtime for DB.
- **SEO**: metadata in each `(public)` page; structured data where useful.
- **Auth**: middleware protects `(portal)/*` and `(admin)/*` by role; booking can be guest or logged-in.

This document is the single source of truth for structure and domain; Prisma schema and code follow it.
