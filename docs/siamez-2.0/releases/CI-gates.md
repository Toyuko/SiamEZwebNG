# Recommended CI Gates (SiamEZ 2.0)

Minimal, high-signal checks for feature branches and merges into `siamez-2.0`.

## Must-have (Wave 1)

| Gate | Command | When | Notes |
|------|---------|------|-------|
| Unit / smoke tests | `npm test` | Every PR | Vitest; authz + booking guards; no Postgres |
| Typecheck | `npm run typecheck` | Every PR | `tsc --noEmit` (app sources; tests excluded) |

## Nice-to-have (next)

| Gate | Command | When | Notes |
|------|---------|------|-------|
| Path-scoped lint | `npx eslint <changed paths> --max-warnings=0` | Every PR | Avoid full-repo lint until debt cleared (~40 pre-existing errors) |
| Production build | `npm run build` | Before promote / nightly | Needs env + Prisma generate |
| Manual P0 checklist | `docs/siamez-2.0/releases/P0-checklist.md` | Security / upload / booking PRs | Human sign-off |

## Explicitly deferred

- Full `npm run lint` as a hard fail (~40 pre-existing errors)
- E2E against live Postgres/Stripe/Blob (add later with mocks or a dedicated preview env)
- Coverage thresholds (establish baseline after suites grow)

## Workflow

`.github/workflows/qa-gates.yml` runs `npm ci` → `npm run typecheck` → `npm test` on pull requests and pushes to `main` / `siamez-2.0` / `agent/**`.
