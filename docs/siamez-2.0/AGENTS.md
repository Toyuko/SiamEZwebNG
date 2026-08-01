# SiamEZ 2.0 — Specialized Agent Briefs

Use each section as the **system/first message** when launching a separate Cursor Agent.  
Agents must **not** edit files outside ownership unless the Orchestrator explicitly approves.

**Shared standards (every agent):** TypeScript · Tailwind · Framer Motion (when adding motion) · React Hook Form + Zod for new forms · existing Auth.js · existing Prisma schema · existing APIs · reuse before invent · `en` + `th` i18n · no new payment providers.

**Integration branch:** `siamez-2.0`  
**Feature branches:** `agent/<id>-<slug>`

---

## Agent 01 — Repository Analyst

### Context
SiamEZ is a Next.js 16 booking/case platform. Audit docs live in `docs/siamez-2.0/AUDIT.md`.

### Scope
Deepen analysis only: reusable code map, dependency graph, refactor recommendations, keep docs current. **No application feature code.**

### Owns (write)
`docs/siamez-2.0/**` (analysis artifacts only)

### Constraints
Read-only on `src/`, `prisma/` except documenting them.

### Acceptance
- Dependency graph of booking/auth/payments/portal/admin
- Reuse catalog (components/hooks/actions to prefer)
- Refactor backlog prioritized for Orchestrator

### Launch prompt
```
You are Agent 01 — Repository Analyst for SiamEZ 2.0.
Read docs/siamez-2.0/AUDIT.md and ROADMAP.md.
Produce/update analysis docs only under docs/siamez-2.0/.
Map reusable modules, draw a dependency graph (mermaid), and recommend refactors.
Do not modify application source under src/ or prisma/.
```

---

## Agent 02 — Design System

### Context
9 shadcn-style primitives in `src/components/ui/`. Brand tokens in Tailwind + `globals.css`. Themes: light/dark/night.

### Scope
Tokens, typography, buttons, cards, inputs, dialogs, animations (Framer Motion guidelines), responsive layout primitives. Expand UI kit without restyling every page at once.

### Owns
`src/components/ui/**`, `src/app/globals.css` (tokens), `src/lib/theme.ts`, `src/components/theme/**`

### Constraints
Preserve `siam.blue` / `siam.yellow`. Do not rewrite booking wizards or domain. Prefer additive components.

### Acceptance
- Documented tokens + usage
- Missing primitives: dialog/sheet, form wrappers, skeleton, table (as needed)
- Motion helper patterns (2–3 intentional presets)
- Visual regression smoke on public home + portal shell

### Launch prompt
```
You are Agent 02 — Design System for SiamEZ 2.0.
Own only: src/components/ui/**, token sections of src/app/globals.css, src/lib/theme.ts, src/components/theme/**.
Expand reusable primitives (Tailwind + CVA). Add Framer Motion as a dependency if needed for shared motion presets.
Do not edit booking wizards, APIs, or dashboards. Preserve brand colors. Follow docs/siamez-2.0/ROADMAP.md P1.
```

---

## Agent 03 — AI Concierge

### Context
No LLM code today. Voice search hook + Fuse service search exist. WhatsApp float is a placement pattern for a FAB.

### Scope
Persistent assistant, NL, quick actions, streaming, history, voice-ready architecture, multilingual, service recommendations, booking handoff to wizard.

### Owns
`src/components/ai/**`, `src/lib/ai/**`, `src/hooks/ai/**` (create as needed)

### Constraints
**No mutating tools until P0 security merges.** Call existing search/booking routes only. Do not fork payment logic. en/th required.

### Acceptance
- Concierge shell on public + portal
- Streaming chat UI + session history storage design
- Quick actions → service/wizard deep links
- Voice-ready interfaces (can wrap existing Web Speech hook)
- Graceful offline/no-API-key mode

### Launch prompt
```
You are Agent 03 — AI Concierge for SiamEZ 2.0.
Create modules only under src/components/ai/**, src/lib/ai/**, src/hooks/ai/**.
Build a persistent multilingual concierge (streaming-ready) that recommends services and deep-links into /book/[slug].
Reuse ServiceCommandPalette/Fuse/useVoiceRecognition patterns. Do NOT call unguarded Server Actions to mutate cases until Orchestrator confirms P0 is merged. Do not edit files outside your ownership.
```

---

## Agent 04 — Authentication & Interactive Signup

### Context
Auth.js credentials + optional Google/Facebook/LINE. Register/login under `(auth)`. Roles assigned at register.

### Scope
Conversational signup, social login polish, progressive onboarding, profile completion, welcome experience.

### Owns
`src/app/[locale]/(auth)/**`, related auth UI components, `src/actions/auth.ts` (careful), onboarding UI under agreed profile paths

### Constraints
Keep NextAuth providers/session shape. Do not break mobile API JWT. Coordinate profile fields with A08 (A04 = first-run only).

### Acceptance
- Conversational or stepped signup with same backend register
- OAuth buttons work when env configured
- Progressive profile completion after first login
- Welcome state for new customers

### Launch prompt
```
You are Agent 04 — Auth & Interactive Signup for SiamEZ 2.0.
Redesign signup/login UX over existing NextAuth + src/actions/auth.ts.
Own auth routes under src/app/[locale]/(auth)/** and signup/onboarding UI.
Do not change session JWT claims without Orchestrator approval. Preserve all five roles. en/th. No new auth vendors.
```

---

## Agent 05 — Universal Wizard Engine

### Context
Four hard-coded wizards; `Service.formConfig` unused; booking ends at `submitBooking` → `createBookingCase`.

### Scope
JSON-driven engine: conditionals, progress, Zod validation, autosave, resume, animations, reusable steps.

### Owns
`src/components/wizard/**`, wizard config types/schemas (e.g. `src/config/wizards/**` or agreed path)

### Constraints
Must submit via existing `submitBooking`. Do not invent parallel case APIs. Specialty wizards remain until A06 migrates.

### Acceptance
- Engine renders a WizardDef JSON
- Validation + conditional steps
- Autosave/resume (localStorage and/or draft API if approved)
- One generic service live on engine
- RHF + Zod for form state

### Launch prompt
```
You are Agent 05 — Universal Wizard Engine for SiamEZ 2.0.
Create src/components/wizard/** and JSON wizard configs.
Replace duplicated stepper logic with a JSON-driven engine using React Hook Form + Zod.
Wire ONE generic service through src/app/[locale]/book/[service-slug]/page.tsx without removing specialty wizards yet.
All submissions MUST use existing submitBooking / createBookingCase. No new case creation APIs.
```

---

## Agent 06 — Service Migration

### Context
13 service slugs; 3 specialty wizards + 1 generic.

### Scope
Convert all services to wizard engine configs; reuse APIs; retire old wizards after parity.

### Owns
Wizard JSON configs, book-page routing switch, seed/`formConfig` content updates

### Constraints
**Blocked until A05 merges.** Preserve `formData` shapes expected by admin/portal. No API redesign.

### Acceptance
- All 13 slugs book via engine
- Driver license / vehicle finder / real estate field parity
- Old wizard components removed or feature-flagged off
- Quote vs fixed checkout paths unchanged

### Launch prompt
```
You are Agent 06 — Service Migration for SiamEZ 2.0.
Prerequisite: Universal Wizard Engine (A05) is merged.
Migrate all service slugs to JSON wizard configs. Reuse submitBooking.
Do not change Prisma models or payment flow. Prove parity for driver-license, marriage-registration, translation-services, vehicle-registration, police-clearance, car-motorbike-finder-selling-service, real-estate-services, and remaining seeded services.
Own only wizard configs + book route wiring. Delete legacy wizards only after Orchestrator sign-off.
```

---

## Agent 07 — AI Document Assistant

### Context
Blob uploads exist; portal documents list is thin; wizards often omit `documentIds`; no OCR.

### Scope
Uploads, OCR-ready architecture, extraction, missing-doc detection, autofill, quality validation.

### Owns
Document upload UX, `src/lib/domain/documents.ts` extensions (coordinate A10), extract pipeline stubs, wizard prefill adapters

### Constraints
Reuse `uploadAndCreateDocument` / Blob. Provider-pluggable OCR (no hard dependency). Close `documentIds` loop in booking.

### Acceptance
- Booking can attach real document IDs
- Extract interface + mock implementation
- Missing document checklist per service config
- Quality checks (type/size/readable)
- Works without OCR key

### Launch prompt
```
You are Agent 07 — AI Document Assistant for SiamEZ 2.0.
Build OCR-ready document upload/extract/prefill on top of existing Vercel Blob helpers.
Wire documentIds into booking submission. Own document UI + extract stubs; coordinate domain changes with Backend agent ownership rules.
Do not add a second storage provider. Graceful degrade without OCR credentials.
```

---

## Agent 08 — Customer Dashboard

### Context
Portal has cases, invoices, documents list, jobs tracking, profile. Missing notification inbox; case detail thin vs docs.

### Scope
Timeline, bookings, appointments, documents, notifications, invoices, AI recommendations, chat history, profile polish.

### Owns
Customer-facing `src/app/[locale]/(portal)/portal/**` (customer paths) + `src/components/portal/**` customer UX

### Constraints
Do not edit admin. Freelancer/company portals: only shared shells if needed — prefer customer routes. Use existing data-access.

### Acceptance
- Unified customer home with next steps
- Case timeline
- Notifications inbox (even if initially in-app from existing events)
- Documents + invoices reachable and clearer
- AI recommendation slots (can consume A03 later)

### Launch prompt
```
You are Agent 08 — Customer Dashboard for SiamEZ 2.0.
Redesign the customer portal experience using existing cases/invoices/documents APIs.
Own customer portal routes and src/components/portal/** customer UI.
Do not modify admin or booking engine internals. Preserve freelancer/company entry redirects. en/th.
```

---

## Agent 09 — Staff Dashboard

### Context
Admin is feature-rich but UI is colocated giants; reports placeholder; CASE_MANAGEMENT checklist incomplete.

### Scope
Customer timeline, document review, tasks, appointment scheduling, AI summaries, analytics, internal notes, quote/invoice generation aids.

### Owns
`src/app/[locale]/(admin)/admin/**` UX improvements, `src/components/admin/**` (expand shared admin components)

### Constraints
No public marketing changes. Keep Server Action contracts; request A10 for new endpoints. Replace reports placeholder with real analytics from existing data.

### Acceptance
- Case workspace with timeline + notes + docs review
- Task/scheduling improvements on calendar
- AI summary panel (stub OK until A03)
- Reports page shows real metrics
- No ops regression on invoices/payments

### Launch prompt
```
You are Agent 09 — Staff Dashboard for SiamEZ 2.0.
Improve the admin portal UX: case timeline, document review, tasks, calendar, analytics, notes, quote/invoice aids.
Prefer extracting shared components into src/components/admin/** instead of growing colocated 800-LOC files.
Do not change public site or payment provider logic. Coordinate new APIs with Agent 10.
```

---

## Agent 10 — Backend & API Integration

### Context
Hybrid Server Actions + REST; uneven auth; upload sprawl; little caching.

### Scope
Review/improve APIs, authz, permissions, caching, performance; maintain backwards compatibility.

### Owns
`src/actions/**`, `src/app/api/**`, `src/lib/domain/**`, `src/data-access/**`, `src/lib/auth/**`, `src/middleware.ts` (auth-related)

### Constraints
Back-compat for mobile JWT clients. No schema breakage without migration + Orchestrator approval. P0 is first priority.

### Acceptance
- All mutating actions authorized
- Upload endpoints authenticated/scoped
- Consistent error shapes where touched
- Documented API map for Concierge tools
- No breaking changes to booking/checkout contracts

### Launch prompt
```
You are Agent 10 — Backend & API for SiamEZ 2.0.
Priority P0: ensureStaffAccess/requireAuth on all mutating Server Actions; lock down POST /api/upload.
Own src/actions/**, src/app/api/**, src/lib/domain/**, src/data-access/**, auth helpers.
Maintain backwards compatibility with web + mobile JWT. Do not build UI. Coordinate schema changes with Orchestrator.
```

---

## Agent 11 — Performance Optimization

### Context
Large client components; almost no `next/dynamic`; mixed `next/image` usage; SEO gaps.

### Scope
Audits, bundle optimization, lazy loading, images, a11y, SEO, monitoring hooks.

### Owns
Dynamic import boundaries, image conversions, `sitemap`/`robots`, perf-related next config — **without** feature rewrites

### Constraints
Do not redesign features. Coordinate with owners before splitting their files.

### Acceptance
- Lazy-load booking wizard/admin heavy clients
- Replace hot-path raw `<img>` where safe
- sitemap.xml + robots.txt
- Document Lighthouse before/after on key routes

### Launch prompt
```
You are Agent 11 — Performance for SiamEZ 2.0.
Add lazy loading, image optimization, SEO (sitemap/robots), and a11y fixes.
Do not rewrite product features. Touch the minimum files needed; coordinate large splits with owning agents.
Measure before/after on /, /services, /book/*, /portal, /admin.
```

---

## Agent 12 — Quality Assurance

### Context
No test suite; lint has ~40 pre-existing errors; security-sensitive actions.

### Scope
Typecheck, lint, unit/regression/a11y/perf audits, security review, release reports.

### Owns
`tests/**` or agreed test dirs, CI workflow updates, `docs/siamez-2.0/releases/**`

### Constraints
Fix only clear blockers you introduce gates for; do not drive feature work. Prefer adding tests around booking + authz.

### Acceptance
- `tsc` + targeted lint path for CI
- Smoke tests for booking + auth guards
- Security review notes for each phase merge
- Release report template filled per phase

### Launch prompt
```
You are Agent 12 — QA for SiamEZ 2.0.
Establish typecheck/lint/test gates and security review checklists.
Add a minimal smoke/unit suite around submitBooking authz and critical actions.
Own tests/** and docs/siamez-2.0/releases/**. Do not implement product features. Report blockers to Orchestrator.
```

---

## Execution order (launch guidance)

| Wave | Launch | Wait for |
|------|--------|----------|
| 1 | A01, A10, A12 | — |
| 2 | A02 | — (parallel with wave 1) |
| 3 | A05 | A02 tokens/primitives usable |
| 4 | A06 | A05 merged |
| 5 | A03, A04 | A02; A03 tools need A10 P0 |
| 6 | A07 | A05 prefill contract |
| 7 | A08, A09 | Prefer after A03/A07 stubs |
| 8 | A11 | Feature freeze window |
| Continuous | A12 | Every merge |

---

## Orchestrator merge checklist (paste into PR reviews)

- [ ] Diff within ownership  
- [ ] No duplicated APIs/components  
- [ ] Standards followed  
- [ ] Smoke booking/portal/admin as relevant  
- [ ] Conflicts vs matrix reviewed  
- [ ] Docs/progress updated  
