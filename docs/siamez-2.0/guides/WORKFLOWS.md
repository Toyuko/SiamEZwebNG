# Workflows — Universal Engine vs WizardEngine

Two distinct engines serve different product flows. Do not conflate them.

---

## Comparison

| | **Universal Workflow Engine** | **WizardEngine** |
|--|-------------------------------|------------------|
| **Purpose** | Multi-step customer journeys (inspection, viewing, relocation checklists) | Single-service booking forms |
| **Config** | DB `WorkflowTemplate` + `WorkflowTemplateStep` | JSON `WizardConfig` in `src/config/wizards/` |
| **Entry** | Portal `/portal/workflows`, Concierge orchestration, admin templates | `/book/[service-slug]` |
| **Outcome** | `WorkflowRun` with step states; optional `linkedCaseId` | `Case` via `submitBooking` |
| **Staff** | Approve/reject steps at `/admin/workflows/approvals` | Case management only |
| **Mobile API** | Templates list only (`GET /api/v1/workflow-templates`) | N/A (web booking) |
| **Code** | `src/lib/workflows/**`, `src/data-access/workflows.ts` | `src/components/wizard/WizardEngine.tsx` |

---

## Universal Workflow Engine

### Models

- `WorkflowTemplate` — definition (title, locale, published)
- `WorkflowTemplateStep` — ordered steps with `kind` (`info`, `action`, `booking`, `approval`), optional `requiresApproval`
- `WorkflowRun` — customer instance; status: `active` | `completed` | `cancelled` | `rejected`
- `WorkflowStepRun` — per-step state machine

### Step targets

Stored as JSON on template steps (`WorkflowStepTarget`):

- `serviceSlug` → book flow
- `listingType` + `listingFilters` or `listingId` (cuid) → marketplace deep link
- `href` — explicit path override

URL helpers: `resolveStepTargetHref`, `parseStepTarget` in `src/lib/workflows/target.ts`.

### Transitions

Pure functions in `src/lib/workflows/transitions.ts`:

- `decideStepTransition`, `decideRunTransition`
- `decideStaffApprove`, `decideStaffReject`
- `computeNextSteps` for customer UI hints

### Case linkage

After a service booking completes, customer can link an active workflow run to the resulting case:

```
WorkflowRun.linkedCaseId → Case.id
```

Function: `linkRunToCase(runId, caseId, userId)` in `src/data-access/workflows.ts`.

Portal UI shows linked case link at `/portal/workflows`. Runs without a linked case can prompt booking steps.

### Admin paths

| Path | Purpose |
|------|---------|
| `/admin/workflows` | Template list |
| `/admin/workflows/new`, `/admin/workflows/[id]` | CRUD |
| `/admin/workflows/approvals` | Pending approval steps |

### Portal paths

| Path | Purpose |
|------|---------|
| `/portal/workflows` | Customer runs, advance steps, view next actions |

### Concierge

Auth-gated orchestration in `src/lib/ai/orchestrate.ts` can start life-event runs and workflow runs. Guests receive login deep-links.

---

## WizardEngine (service booking)

JSON-driven stepper for professional services:

1. User visits `/[locale]/book/[service-slug]`
2. `hasWizardEngine(slug)` gate in book page
3. `WizardEngine` renders steps from config (RHF + Zod)
4. Submit → `submitBooking` → `createBookingCase`

All 13 seeded service slugs use WizardEngine. Legacy specialty wizard components are deprecated.

**Not a workflow run.** Booking creates a `Case` directly; staff manage it in admin case workspace.

---

## Life Events (related)

Configurable multi-step journeys (`LifeEvent`, `LifeEventStep`, `LifeEventProgress`). Often paired with Goals:

- Progress syncs linked goals via `syncLinkedGoalsFromLifeEvent`
- REST at `/api/v1/life-events/**`
- Admin CRUD at `/admin/life-events`
- Customer hub at `/portal/goals`

Life events and workflows share the “journey” product concept but separate data models.

---

## Seed templates

Inspection and property viewing workflow templates seeded for demo. See `prisma/seed.ts`.

---

## Tests

- `tests/unit/workflows.test.ts`
- `tests/unit/wizard-engine.test.ts`
- `tests/unit/life-events-goals.test.ts`
- `tests/unit/concierge-orchestration.test.ts`
