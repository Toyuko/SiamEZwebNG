# P0 — Security / QA Merge Checklist

**Phase:** P0 Security Hardening  
**Owners:** A10 (Backend), A12 (QA)  
**Integration branch:** `siamez-2.0`  
**Use:** Copy into PR description or review comments before merging any Wave 1+ security or mutating-capability work.

---

## 1. AuthN / AuthZ (blocking)

- [ ] Every **mutating** Server Action calls `requireAuth` / `requireStaff` / role helper (or equivalent) before writes
- [ ] Staff-only actions reject `customer` / `freelancer` / `company` (`Forbidden`)
- [ ] Portal-scoped actions cannot escalate to admin/staff
- [ ] Mobile API routes that mutate data require Bearer JWT **or** session via `resolveApiUserId` / `getApiUser`
- [ ] Inactive users cannot authenticate (`getApiUser` / credentials path)
- [ ] No new unauthenticated write path introduced for cases, documents, invoices, quotes, payments, or marketplace jobs

## 2. Uploads (blocking for P0)

- [ ] `POST /api/upload` default (sales listing) path is authenticated **or** purpose-scoped / signed (document current intentional exception if any)
- [ ] `purpose=tracking` requires freelancer session + job access check
- [ ] `purpose=chat` requires job participant (client or freelancer)
- [ ] Document upload routes (`/api/documents/upload`, chat upload) require auth and ownership/scope checks
- [ ] MIME/size validators still reject empty, oversized, and disallowed types

## 3. Booking / checkout smoke (manual or automated)

- [ ] Guest booking: `/en/book/<slug>` → `submitBooking` → Case created → checkout or quote confirmation
- [ ] Logged-in booking: Case linked to `userId`
- [ ] Guest checkout token cannot access another case
- [ ] Admin can open the new case after login (`admin@siamez.com` seed or staging equivalent)
- [ ] Guest booking without email fails closed (`Guest email required`)
- [ ] Logged-in booking without `userId` fails closed

## 4. Redirect / session safety

- [ ] Post-login redirects are same-origin relative only (`resolvePostAuthRedirect` / `safeRedirectQueryParam`)
- [ ] No open redirect via `?redirect=` to `//…` or absolute URLs
- [ ] Role landing paths: customer → portal, freelancer → `/portal/freelancer`, company → `/portal/company`

## 5. Secrets & config

- [ ] No secrets committed (`.env*`, tokens, private keys)
- [ ] `API_JWT_SECRET` / `NEXTAUTH_SECRET` present in target env
- [ ] `BYPASS_ADMIN_AUTH` is **not** `true` in staging/production
- [ ] Cron / webhook routes still require their shared secrets

## 6. Automated gates (CI / local)

| Gate | Command | P0 expectation |
|------|---------|----------------|
| Unit / smoke | `npm test` | **Must pass** |
| Typecheck | `npm run typecheck` | **Must pass** on app sources; track baseline separately if pre-existing errors |
| Lint | `npm run lint` | **Do not block** on ~40 pre-existing errors; new files should be clean where practical |
| Build | `npm run build` | Required before production promote; optional on feature PRs |

### Pre-existing lint debt (do not “fix all” in P0)

`npm run lint` currently reports ~40 errors with `--max-warnings=0`. These are environment/historical, not introduced by QA gates. Track cleanup outside the security merge bar. Prefer path-scoped lint on new files when tightening CI later:

```bash
npx eslint tests vitest.config.ts --max-warnings=0
```

## 7. AI / Concierge readiness (gate for A03 tools)

- [ ] P0 authz merges landed on `siamez-2.0`
- [ ] Concierge has **no mutating tools** until this checklist is green
- [ ] Any future tool that creates/updates cases or documents reuses existing authorized Server Actions / APIs

## 8. Residual risk notes (fill per PR)

| Item | Status / note |
|------|----------------|
| Unauthenticated general `/api/upload` | |
| Actions still missing `ensureStaffAccess` / `requireAuth` | |
| Schema / API contract changes | |
| Manual smoke performed by | |
| Follow-ups filed | |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| A10 Backend | | | Pass / Fail |
| A12 QA | | | Pass / Fail |
| Orchestrator | | | Merge / Hold |
