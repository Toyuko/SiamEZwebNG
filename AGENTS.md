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
- `BYPASS_ADMIN_AUTH="true"` is set so `/admin` is reachable without login during local dev.

### Database setup gotcha (important)
- The committed migrations in `prisma/migrations/` contain **MySQL syntax (backticks)** and FAIL against PostgreSQL. Do NOT run `prisma migrate deploy` / `npm run db:migrate` / `npm run vercel-build` locally.
- Use `npx prisma db push` to sync the schema, then `npm run db:seed` to seed. Re-running `db:seed` is idempotent (upserts) and refreshes the demo passwords.

### Seed/login credentials (after `npm run db:seed`)
- Admin `admin@siamez.com` / `ChangeMeInProduction!`
- Client `customer@example.com` / `Customer123!`
- Freelancer `freelancer@example.com` / `Freelancer123!`

### Vercel integration (project `siam-e-zweb-ng`)
- The repo is already linked to the Vercel project via `.vercel/project.json` (`projectId prj_RbOMeoZeEcePysM95PRJGhiBDuO6`, team `team_cMJ9dUQnkpzJlkONhFOuJ9MV`). Live URL: https://siam-e-zweb-ng.vercel.app/
- The Vercel CLI is installed under `~/.npm-global/bin` (on `PATH` via `~/.bashrc`).
- Non-interactive auth requires a `VERCEL_TOKEN` (add it as a Cursor secret; `vercel login` / `whoami` will hang in the agent because they prompt interactively).
- Pull cloud env vars into local files (Next.js reads `.env.local`, Prisma CLI reads `.env`):
  ```bash
  vercel env pull .env.local --environment=development --token="$VERCEL_TOKEN" --yes
  cp .env.local .env
  ```
- WARNING: pulling `--environment=production` brings the real (Neon) `DATABASE_URL`. Do NOT run `prisma db push` / `npm run db:seed` / `migrate` against the production database. For local schema work keep using the local Postgres `siamez` DB.

### Lint / build notes
- `npm run lint` runs but currently reports ~40 pre-existing errors (`--max-warnings=0`); these are not environment issues.
- Booking flow (core feature): `/en/booking/<service-slug>` (e.g. `/en/booking/marriage-registration`) → submitting creates a guest `Case` row.
- Stripe, Vercel Blob, Pusher, Expo push, and OAuth are all optional/feature-specific and not configured locally.
