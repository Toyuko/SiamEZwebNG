# Developer Guide — Platform 2.1

Local setup, commands, ownership rules, and platform utilities.

---

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (local or Neon)
- npm

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` → `.env.local` (Next.js) and `.env` (Prisma CLI).

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (pooler OK for runtime) |
| `DIRECT_URL` | Non-pooler URL for migrations (Neon) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Auth.js session signing |
| `API_JWT_SECRET` | Mobile Bearer JWT (defaults to NEXTAUTH_SECRET) |
| `BYPASS_ADMIN_AUTH=true` | Skip admin login locally only |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads (optional locally) |
| `OPENAI_API_KEY` | Concierge LLM mode (optional — rule mode works without) |

Local default DB:

```
postgresql://postgres:postgres@localhost:5432/siamez?schema=public
```

Start local PostgreSQL (cloud VM):

```bash
sudo pg_ctlcluster 16 main start
```

### 3. Database

**Preferred for fresh local PostgreSQL** (older migrations may contain MySQL syntax):

```bash
npx prisma db push
npm run db:seed
```

Production / Vercel:

```bash
npm run vercel-build   # migrate-deploy.sh + next build
```

### 4. Run dev server

```bash
npm run dev          # webpack (default)
npm run dev:turbo    # turbopack
```

| Surface | URL |
|---------|-----|
| Public | http://localhost:3000/en |
| Portal | http://localhost:3000/en/portal |
| Admin | http://localhost:3000/en/admin |

---

## Seed credentials

After `npm run db:seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@siamez.com` | `ChangeMeInProduction!` |
| Customer | `customer@example.com` | `Customer123!` |
| Freelancer | `freelancer@example.com` | `Freelancer123!` |
| Company | `company@example.com` | `Company123!` |

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (`--max-warnings=0`; ~40 pre-existing issues) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:push` | Prisma schema push (local) |
| `npm run db:seed` | Seed data |
| `npm run db:studio` | Prisma Studio |
| `npm run db:migrate` | Production migrate script |

---

## Ownership rules (additive engines)

From `docs/siamez-2.0/AGENTS.md`:

- **Extend, don't fork** — new features add modules under `src/lib/{engine}/`, not parallel implementations in routes
- **Server Actions** for web mutations; **REST `/api/v1`** for mobile bridge
- **Preserve listing cuid URLs** — use `src/lib/migration/urls.ts`
- **Do not break** `submitBooking` / case creation contracts
- **en + th** i18n for user-facing strings (`messages/en.json`, `messages/th.json`)
- Agent ownership boundaries apply on feature branches; Orchestrator merges to `siamez-2.0`

Engine locations:

```
src/lib/ai/
src/lib/goals/
src/lib/life-events/
src/lib/recommendations/
src/lib/workflows/
src/lib/search/
src/lib/migration/
src/lib/marketplace/
src/lib/feature-flags.ts
src/lib/analytics/
src/lib/security/
```

---

## Feature flags

```ts
import { isFeatureEnabled } from "@/lib/feature-flags";

if (await isFeatureEnabled("marketplace_beta")) {
  // gated UI
}
```

Admin toggles at `/admin/feature-flags`. Defaults in `DEFAULT_FLAGS`. DB-backed with 30s cache.

Add a new flag:

1. Add key to `DEFAULT_FLAGS` in `src/lib/feature-flags.ts`
2. Extend Zod enum in `src/actions/feature-flags.ts`
3. Seed or toggle via admin UI

---

## Rate limit interface

`src/lib/security/rate-limit.ts`:

```ts
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const rl = checkRateLimit(
  clientKeyFromRequest(request, "my-route"),
  10,      // max hits
  60_000   // window ms
);
if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);
```

Swap in-memory store for Redis/Upstash in production — keep the same function signatures.

Test helper: `resetRateLimitBucketsForTests()`.

---

## Magic-byte upload sniff

```ts
import { sniffFileHead, isAllowedUploadKind } from "@/lib/security/magic-bytes";

const kind = await sniffFileHead(file);
if (!isAllowedUploadKind(kind, "media")) { /* reject */ }
```

Purposes: `"image"` | `"document"` | `"media"`.

---

## Testing

Vitest config in project root. Key suites:

- Auth guards, admin bypass, rate limit
- Workflows, wizard engine, concierge
- Marketplace engagement, badges, URLs
- Feature flags, journey context

Run targeted:

```bash
npm test -- tests/unit/feature-flags.test.ts
```

---

## Deploy notes (Neon / Vercel)

- Set pooled `DATABASE_URL` and direct `DIRECT_URL`
- P1002 advisory lock: terminate stuck migrate session in Neon SQL editor
- `BYPASS_ADMIN_AUTH` never honored on Vercel prod/preview

See [../PLATFORM-2.1-SECURITY.md](../PLATFORM-2.1-SECURITY.md) for DR recommendations.

---

## Docs index

| Doc | Topic |
|-----|-------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview |
| [API.md](./API.md) | Route map |
| [WORKFLOWS.md](./WORKFLOWS.md) | Workflow vs wizard |
| [MARKETPLACE.md](./MARKETPLACE.md) | Listings |
| [ADMIN.md](./ADMIN.md) | Staff guide |
| [../AGENTS.md](../AGENTS.md) | Agent ownership briefs |
