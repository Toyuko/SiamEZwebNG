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
   npx prisma db push
   npm run db:seed
   ```

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

1. Connect repo to Vercel.
2. Set env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Stripe keys.
3. Build: `npm run build`. Use `prisma generate` in build (postinstall) and run migrations in a release step or manually: `npx prisma migrate deploy`.
4. Optional: run seed once (e.g. from CI or locally against prod DB).

## Content

Services and copy are based on [siam-ez.com](https://siam-ez.com). Seed data in `prisma/seed.ts` populates the service catalog (marriage registration, translation, driver's license, police clearance, visa, construction, vehicle registration, transportation, private driver).
