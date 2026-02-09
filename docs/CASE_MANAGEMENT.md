# Case Management Architecture

## Lifecycle

Every booking produces one **Case**. Cases move through statuses; staff drive transitions for quote-based, and payments drive transitions for fixed-price.

### Statuses (Prisma enum `CaseStatus`)

- **new** – Just submitted; no quote yet (quote-based) or awaiting payment (fixed-price).
- **under_review** – Staff is reviewing (quote-based).
- **quoted** – Quote sent to client.
- **awaiting_payment** – Quote accepted or fixed-price; payment pending.
- **paid** – Payment received.
- **in_progress** – Work in progress.
- **pending_docs** – Waiting for client documents.
- **completed** – Done.
- **cancelled** – Cancelled.

### Transitions

- **Customer**: Can only submit booking (creates `new`); can accept quote (→ `awaiting_payment`); can pay (→ `paid` via webhook).
- **Staff/Admin**: Can move `new` → `under_review` → `quoted`; can set `in_progress`, `pending_docs`, `completed`, `cancelled`; can assign staff and add notes.

### Quotes

- **Quote-based service**: Admin creates Quote (draft) for a Case, sets amount and optional `validUntil`. "Send quote" sets status `sent` and Case status → `quoted`. Client accepts → Case → `awaiting_payment`; client pays → `paid` (and optionally link Invoice to Quote).
- **Fixed-price**: Optional single Quote for record-keeping; payment amount usually from Service.priceAmount.

### Payments

- Stored in **Payment** model: `caseId`, amount, currency, status, type (full, deposit, additional, refund), Stripe IDs.
- Stripe webhook `payment_intent.succeeded` creates or updates Payment and sets Case to `paid` if applicable.
- **Invoice** can link to Quote and Case; status `sent` / `paid` / `overdue`. Invoices can be created from Quote or ad hoc for additional charges.

### Documents

- **Document** belongs to Case; has `uploadedBy` (user or null), `storageKey`, `name`, `documentType`.
- Uploads: API route or Server Action stores file (e.g. Vercel Blob), then create Document with `caseId`. Customer portal and admin can both upload; admin can see all, customer sees only their case’s docs.

### Staff & Notes

- **StaffAssignment**: Links Case to User (staff); role `primary` or `support`. Admin assigns from case detail.
- **CaseNote**: Content, `isInternal` (admin-only vs client-visible). Only staff/admin create notes.

## Admin Case Detail Page

**Route**: `/admin/cases/[id]`

- **Sections**: Header (case number, service, client, status); Status pipeline (dropdown or buttons for allowed transitions); Assigned staff (assign/unassign); Quotes (list, create, send); Payments (list, link to Stripe); Documents (list, upload); Notes (list, add internal/public).
- **Data**: `getCaseById(id)` with relations (service, user, quotes, payments, documents, staffAssignments, caseNotes). Server Component for initial load; Server Actions for status update, assign, add note, upload doc.

## Customer Case Detail Page

**Route**: `/portal/cases/[id]`

- **Sections**: Case number, service, status; List of quotes (accept button if status `quoted`); Pay invoice / payment link if `awaiting_payment`; Documents (list, upload); Public notes only.
- **Auth**: Ensure `session.user.id === case.userId` (or case shared with user).

## Implementation Checklist

- [ ] Admin case detail: `src/app/(admin)/admin/cases/[id]/page.tsx` + Server Actions for status, assign, note, doc.
- [ ] Customer case detail: `src/app/(portal)/portal/cases/[id]/page.tsx` + Actions for accept quote, pay, upload doc.
- [ ] Status transition rules: enforce in Server Actions (e.g. only staff can set `under_review`, `quoted`, `in_progress`, etc.).
- [ ] Quote send: create/update Invoice, send email (optional), set Quote status `sent`, Case status `quoted`.
- [ ] Calendar: optional view of cases by due date or appointment date (add `dueDate` to Case if needed).
