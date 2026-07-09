# AGENTS.md

## Cursor Cloud specific instructions

This is a single Next.js 16 app (`siamez-web-ng`) — a services booking & case-management platform backed by PostgreSQL via Prisma. Standard commands live in `package.json` `scripts` and `README.md`; only the non-obvious cloud setup notes are captured here.

### Services
- **PostgreSQL** (local cluster, port 5432) — required. It is installed in the VM and the `siamez` database is already created and seeded. It is NOT auto-started; start it each session with:
  `sudo pg_ctlcluster 16 main start`
- **Next.js dev server** (port 3000) — `npm run dev` (webpack). Public site `/`, portal `/portal`, admin `/admin`. Routes are locale-prefixed (e.g. `/en/services`).

### Env files (gitignored, present in the VM)
- `.env.local` is read by Next.js; `.env` is a copy read by the **Prisma CLI** (Prisma does not read `.env.local`). Keep both in sync if you change `DATABASE_URL`.
- Local `DATABASE_URL` is `postgresql://postgres:postgres@localhost:5432/siamez?schema=public`.
- On Neon/Vercel: set `DATABASE_URL` to the **pooled** (`-pooler`) URL and `DIRECT_URL` to the **direct** host (same string without `-pooler`). Prisma Migrate needs the direct URL (`directUrl` in `schema.prisma`); `scripts/migrate-deploy.sh` also strips `-pooler` as a fallback.
- `BYPASS_ADMIN_AUTH="true"` is set so `/admin` is reachable without login during local dev.

### Database setup gotcha (important)
- Older committed migrations in `prisma/migrations/` may contain **MySQL syntax (backticks)** and FAIL against a fresh local PostgreSQL. Prefer `npx prisma db push` + `npm run db:seed` for local cloud VMs.
- Production/Vercel uses `npm run vercel-build` → `scripts/migrate-deploy.sh` (direct Neon URL) then `next build`. If deploy fails with **P1002 advisory lock**, a stuck session is holding Prisma’s migrate lock — terminate that backend in Neon SQL Editor (`SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype = 'advisory' AND objid = 72707369;`) and redeploy.

### Seed/login credentials (after `npm run db:seed`)
- Admin `admin@siamez.com` / `ChangeMeInProduction!`
- Client `customer@example.com` / `Customer123!`
- Freelancer `freelancer@example.com` / `Freelancer123!`
- Company `company@example.com` / `Company123!`

### Lint / build notes
- `npm run lint` runs but currently reports ~40 pre-existing errors (`--max-warnings=0`); these are not environment issues.
- Booking flow (core feature): `/en/booking/<service-slug>` (e.g. `/en/booking/marriage-registration`) → submitting creates a guest `Case` row.
- Stripe, Vercel Blob, Pusher, Expo push, and OAuth are all optional/feature-specific and not configured locally.
