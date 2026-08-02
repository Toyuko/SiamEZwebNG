# SiamEZ Platform 2.1 — Security Review

**Date:** 2026-08-02  
**Scope:** Auth, authz, rate limiting, uploads, OAuth, admin bypass, monitoring, DR  
**Baseline:** Platform 2.0 M0–M7 + 2.1 Phases 2–8

---

## Executive summary

Platform 2.1 Phase 8 added in-memory rate limits, magic-byte sniffing on general uploads, and hardened admin bypass guards. Core auth remains solid. Gaps: distributed rate limiting, OAuth account-linking policy, chat/tracking upload sniffing, structured error tracking, and documented Neon DR.

| Status | Count |
|--------|------:|
| Complete | 3 |
| Needs Improvement | 6 |
| Missing | 2 |

---

## Control matrix

| Control | Status | Evidence | Notes |
|---------|--------|----------|-------|
| **Authentication** | **Complete** | `src/auth.ts`, `src/lib/auth.ts`, `POST /api/auth/login` | Auth.js v5 JWT sessions; bcrypt credentials; inactive users rejected; mobile JWT via `createApiJwtForUser` |
| **Authorization (Server Actions / layouts)** | **Needs Improvement** | `requireAuth`, `requireStaff`, `requireFreelancer`, `requireCompany` | Strong server-side role gates on mutating paths |
| **Authorization (middleware)** | **Needs Improvement** | `src/middleware.ts` | Portal/admin gates check **cookie presence only**; role verified in layouts/actions, not middleware |
| **API permissions (`/api/v1`)** | **Needs Improvement** | `requireBearerApiUser`, `withBearerUser`, `withOptionalBearerUser` | Bearer routes auth'd; Zod coverage uneven on some legacy routes |
| **Rate limiting** | **Needs Improvement** | `src/lib/security/rate-limit.ts` | Login 20/min, contact 8/min, upload 40/min per IP; **in-memory only** — not shared across serverless instances |
| **File upload validation** | **Needs Improvement** | `POST /api/upload`, `src/lib/uploads/*` | General uploads: MIME + size + magic-byte; chat/tracking: MIME/size only, no sniff |
| **Magic-byte sniffing** | **Needs Improvement** | `src/lib/security/magic-bytes.ts` | JPEG/PNG/GIF/WebP/PDF/MP4/WebM on `handleGeneralUpload`; not applied to job chat/tracking paths |
| **Input validation** | **Needs Improvement** | Zod on contact, booking, feature flags, saved searches | Strong on critical paths; legacy routes vary |
| **OAuth account linking** | **Needs Improvement** | `src/auth.ts` | Google/Facebook/LINE use `allowDangerousEmailAccountLinking: true` — takeover risk if provider email unverified |
| **Admin auth bypass** | **Complete** | `src/lib/auth/admin-bypass.ts` | `BYPASS_ADMIN_AUTH=true` honored only when **not** Vercel prod/preview and **not** `NODE_ENV=production` |
| **Error logging** | **Needs Improvement** | `console.error` / `console.warn` | No structured log pipeline |
| **Monitoring / APM** | **Missing** | — | No Sentry, Datadog, or OpenTelemetry integration |
| **Backup / DR (documented)** | **Missing** | Neon implied via `DATABASE_URL` | No runbook under `docs/`; see recommendations below |

---

## Rate limiting detail

Interface: `checkRateLimit(key, limit, windowMs)` → `{ allowed, remaining, retryAfterSec }`.

| Route | Key prefix | Limit | Window |
|-------|------------|------:|--------|
| `POST /api/auth/login` | `auth-login` | 20 | 60s |
| `POST /api/contact` | `contact` | 8 | 60s |
| `POST /api/upload` | `upload` | 40 | 60s |

Client key: `clientKeyFromRequest(request, prefix)` — first `x-forwarded-for` hop or `x-real-ip`.

429 response: `{ success: false, error: "Too many requests..." }` + `Retry-After` header.

**Limitation:** Single-process `Map` buckets. Warm serverless instances each maintain separate counters. Swap for Redis/Upstash using the same interface for production multi-region.

---

## Upload validation detail

| Path | Auth | Size | MIME | Magic-byte |
|------|------|------|------|------------|
| General (sales listing media) | Session or Bearer | 10 MB image / 100 MB video | `image/*`, `video/*` | Yes (`purpose: media`) |
| Job chat (`purpose=chat`) | Job participant | 10 MB | Images + PDF | No |
| Job tracking (`purpose=tracking`) | Freelancer on job | 5 MB | JPG/PNG/PDF | No |

All blobs stored via Vercel Blob with `access: "public"`. Document uploads via `POST /api/documents/upload` use separate ownership checks (`assertCanAttachDocumentToCase`).

---

## OAuth linking risk

`allowDangerousEmailAccountLinking: true` on Google, Facebook, and LINE providers allows automatic merge when OAuth email matches an existing credentials account. Risk: attacker registers OAuth with victim email (if provider does not verify email) → gains access to victim account.

**Mitigation options:** disable auto-linking; require password re-auth or email verification before merge; use provider-specific subject IDs only.

---

## Admin bypass

Local dev convenience only. `isAdminAuthBypassEnabled()` returns `false` when:

- `VERCEL_ENV` is `production` or `preview`
- `NODE_ENV` is `production`

Middleware skips admin login redirect when bypass is enabled. Layout still validates staff role unless bypass is active.

---

## Monitoring gaps

- No error aggregation (Sentry/similar)
- No request tracing or latency dashboards
- Platform events logged to `PlatformMetricEvent` table via `trackPlatformEvent` — queryable but not real-time alerting
- Contact form falls back to `console.warn` when webhook unset

---

## Neon backup recommendations

1. **Enable Neon PITR** on production project (7–30 day window per plan).
2. **Schedule logical exports** — weekly `pg_dump` to encrypted object storage for cross-provider DR.
3. **Document restore procedure:**
   - PITR: Neon console → Restore branch to timestamp → update `DATABASE_URL` / run smoke tests
   - Logical: `pg_restore` to staging branch → `prisma migrate deploy` → verify seed invariants
4. **Test restore quarterly** on a disposable branch.
5. **Keep `DIRECT_URL`** (non-pooler) for migrations; pooler URL for runtime only.

---

## Recommended next steps

| Priority | Action |
|----------|--------|
| P0 | Replace in-memory rate limiter with Redis/Upstash on auth/contact/upload |
| P0 | Add Sentry (or equivalent) for server + client error capture |
| P1 | Remove or gate `allowDangerousEmailAccountLinking`; add explicit account-merge UX |
| P1 | Extend magic-byte sniff to chat/tracking uploads |
| P1 | Write Neon backup/restore runbook (`docs/ops/DR.md`) and assign owner |
| P2 | Middleware role verification for `/admin/*` (defense in depth) |
| P2 | Uniform Zod validation on all mutating `/api/v1` routes |
| P2 | Structured JSON logging with request correlation IDs |
| P3 | Virus scan hook for document uploads (ClamAV or cloud AV) |
| P3 | Rate-limit Concierge chat endpoint separately |

---

## Tests

- `tests/unit/rate-limit.test.ts`
- `tests/unit/admin-bypass.test.ts`
- `tests/unit/upload-validators.test.ts`
- `tests/unit/document-upload-api-authz.test.ts`
- `tests/unit/auth-guards.test.ts`
