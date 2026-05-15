# SiamEZ Web NG

Production-grade, mobile-first services booking platform for SiamEZ (Thailand: visas, business registration, legal, relocation, etc.).

## Tech stack

- **Next.js 15** (App Router), TypeScript, Tailwind CSS
- **PostgreSQL** + **Prisma** ORM
- **Stripe** (payments)
- **Vercel** (hosting)
- Auth: email/password + roles (admin, staff, customer)

## Getting started

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Set `DATABASE_URL` (PostgreSQL/Neon). Optional for first run: Stripe and NextAuth vars.

3. **Database**
   ```bash
   npx prisma generate
   npx prisma migrate deploy   # or: npx prisma db push (local dev)
   npm run db:seed
   ```

   **Seed credentials** (after `db:seed`):

   | Role | Email | Password |
   |------|-------|----------|
   | Admin | `admin@siamez.com` | `ChangeMeInProduction!` (or `SEED_ADMIN_PASSWORD`) |
   | Client | `customer@example.com` | `Customer123!` |
   | Freelancer | `freelancer@example.com` | `Freelancer123!` |

   Freelancers appear under **Admin → Freelancers**, not on the Clients page. Re-running `db:seed` refreshes passwords and ensures the freelancer profile exists.

4. **Run**
   ```bash
   npm run dev
   ```
   - Public site: [http://localhost:3000](http://localhost:3000)
   - Portal: [http://localhost:3000/portal](http://localhost:3000/portal)
   - Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Project structure

- `docs/ARCHITECTURE.md` – Folder structure and data flow
- `docs/BOOKING_FLOW.md` – Booking wizard and case creation
- `docs/CASE_MANAGEMENT.md` – Case lifecycle, quotes, payments, documents
- `prisma/schema.prisma` – PostgreSQL schema (User, Service, Case, Quote, Payment, Document, StaffAssignment, CaseNote, Invoice)
- `src/app/(public)/` – Marketing: Home, Services, About, Contact, Success Stories
- `src/app/(portal)/` – Customer portal: dashboard, cases, profile, invoices, documents
- `src/app/(admin)/` – Admin dashboard: cases, clients, services, calendar, reports
- `src/app/booking/` – Booking wizard and thank-you page
- `src/actions/` – Server Actions (booking, case, etc.)
- `src/data-access/` – Prisma wrappers
- `src/components/` – UI and layout components

## Deploy (Vercel)

The repo is linked to the Vercel project **siam-e-zweb-ng** (see `.vercel/project.json`). Every push to GitHub triggers a deployment via [`.github/workflows/vercel-deploy.yml`](.github/workflows/vercel-deploy.yml).

### One-time GitHub setup

1. Create a Vercel token: [vercel.com/account/tokens](https://vercel.com/account/tokens) (scope: deploy for **Toyuko's projects**).
2. In GitHub → **Settings → Secrets and variables → Actions**, add repository secret:
   - `VERCEL_TOKEN` — your Vercel token

Pushes to `main` deploy to **production**; other branches get **preview** URLs.

**Note:** Vercel is already connected to this GitHub repo, so pushes deploy automatically without the Action. Add `VERCEL_TOKEN` only if you want GitHub Actions to deploy as well (optional backup).

### Vercel project setup

1. Connect this repo in the Vercel dashboard if it is not already linked.
2. Set env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, Stripe keys, `CRON_SECRET`, etc. (see `.env.example`).
3. Build uses `npm run vercel-build` (`prisma migrate deploy` then `next build`).
4. Optional: run seed once (e.g. from CI or locally against prod DB).

If you see **two deployments per push**, disable automatic Git deployments in Vercel → Project → **Settings → Git** (use either native Git hooks or the GitHub Action, not both).

## Content

Services and copy are based on [siam-ez.com](https://siam-ez.com). Seed data in `prisma/seed.ts` populates the service catalog (marriage registration, translation, driver's license, police clearance, visa, construction, vehicle registration, transportation, private driver).
