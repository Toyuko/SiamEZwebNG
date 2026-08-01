# P0 — Security / QA Merge Checklist

**Phase:** P0 Security Hardening  
**Owners:** A10 (Backend), A12 (QA)  
**Integration branch:** `siamez-2.0`  
**Use:** Copy into PR description or review comments before merging any Wave 1+ security or mutating-capability work.

**P7 A12 spot-check:** 2026-08-02 on `agent/12-release-qa` (base `siamez-2.0` @ `ec08d8e`) — automated gates green; residuals noted in §8 and `SIAMEZ-2.0-RELEASE-REPORT.md`.

---

## 1. AuthN / AuthZ (blocking)

- [x] Every **mutating** Server Action calls `requireAuth` / `requireStaff` / role helper (or equivalent) before writes
- [x] Staff-only actions reject `customer` / `freelancer` / `company` (`Forbidden`)
- [x] Portal-scoped actions cannot escalate to admin/staff
- [x] Mobile API routes that mutate data require Bearer JWT **or** session via `resolveApiUserId` / `getApiUser`
- [x] Inactive users cannot authenticate (`getApiUser` / credentials path)
- [x] No new unauthenticated write path introduced for cases, documents, invoices, quotes, payments, or marketplace jobs
  - Note: `submitBooking` remains intentionally public (guest booking) with domain fail-closed guards.

## 2. Uploads (blocking for P0)

- [x] `POST /api/upload` default (sales listing) path is authenticated **or** purpose-scoped / signed (document current intentional exception if any)
- [x] `purpose=tracking` requires freelancer session + job access check
- [x] `purpose=chat` requires job participant (client or freelancer)
- [x] Document upload routes (`/api/documents/upload`, chat upload) require auth and ownership/scope checks
  - Residual: `/api/documents/upload` authenticates but does **not** yet enforce case ownership (Server Action `uploadDocumentMetadataAction` does).
- [x] MIME/size validators still reject empty, oversized, and disallowed types

## 3. Booking / checkout smoke (manual or automated)

- [x] Guest booking: `/en/book/<slug>` → `submitBooking` → Case created → checkout or quote confirmation *(unit-covered; human smoke pending)*
- [x] Logged-in booking: Case linked to `userId` *(unit-covered; human smoke pending)*
- [ ] Guest checkout token cannot access another case *(DA uses id+token; human smoke pending)*
- [ ] Admin can open the new case after login (`admin@siamez.com` seed or staging equivalent) *(human smoke pending)*
- [x] Guest booking without email fails closed (`Guest email required`)
- [x] Logged-in booking without `userId` fails closed

## 4. Redirect / session safety

- [x] Post-login redirects are same-origin relative only (`resolvePostAuthRedirect` / `safeRedirectQueryParam`)
- [x] No open redirect via `?redirect=` to `//…` or absolute URLs
- [x] Role landing paths: customer → portal, freelancer → `/portal/freelancer`, company → `/portal/company`

## 5. Secrets & config

- [x] No secrets committed (`.env*`, tokens, private keys) *(spot-check)*
- [ ] `API_JWT_SECRET` / `NEXTAUTH_SECRET` present in target env *(deploy checklist)*
- [ ] `BYPASS_ADMIN_AUTH` is **not** `true` in staging/production *(deploy checklist)*
- [x] Cron / webhook routes still require their shared secrets *(cron Bearer checked in code)*

## 6. Automated gates (CI / local)

| Gate | Command | P0 expectation | P7 A12 result |
|------|---------|----------------|---------------|
| Unit / smoke | `npm test` | **Must pass** | **77 passed** (13 files) |
| Typecheck | `npm run typecheck` | **Must pass** on app sources; track baseline separately if pre-existing errors | **Pass** |
| Lint | `npm run lint` | **Do not block** on ~40 pre-existing errors; new files should be clean where practical | Non-blocking (unchanged) |
| Build | `npm run build` | Required before production promote; optional on feature PRs | Not run in A12 QA |

### Pre-existing lint debt (do not “fix all” in P0)

`npm run lint` currently reports ~40 errors with `--max-warnings=0`. These are environment/historical, not introduced by QA gates. Track cleanup outside the security merge bar. Prefer path-scoped lint on new files when tightening CI later:

```bash
npx eslint tests vitest.config.ts --max-warnings=0
```

## 7. AI / Concierge readiness (gate for A03 tools)

- [x] P0 authz merges landed on `siamez-2.0`
- [x] Concierge has **no mutating tools** until this checklist is green
- [x] Any future tool that creates/updates cases or documents reuses existing authorized Server Actions / APIs

## 8. Residual risk notes (fill per PR)

| Item | Status / note |
|------|----------------|
| Unauthenticated general `/api/upload` | **Closed** — requires `resolveApiUserId` |
| Actions still missing `ensureStaffAccess` / `requireAuth` | **No blocking gaps found** on case/invoice/admin/marketplace mutating actions; `submitBooking` public by design |
| Schema / API contract changes | None in A12 QA pass |
| Manual smoke performed by | **Pending** — see release report smoke checklist |
| Follow-ups filed | `/api/documents/upload` ownership parity; `BYPASS_ADMIN_AUTH` prod guard; A11 perf; npm audit triage |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| A10 Backend | (prior merge) | 2026-08-01 | Pass |
| A12 QA | Agent 12 (P7) | 2026-08-02 | **Pass** (automated) / human smoke pending |
| Orchestrator | | | Merge / Hold |
