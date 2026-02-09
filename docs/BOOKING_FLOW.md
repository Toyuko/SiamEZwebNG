# Booking Flow Architecture

## Overview

Every booking creates a **Case**. The flow differs by service type:

- **Fixed-price**: Client completes wizard → optional immediate payment (Stripe) → Case created with status `new` (or `paid` if pay-now).
- **Quote-based**: Client completes wizard → Case created with status `new` → Admin reviews, creates/sends Quote → Client accepts and pays → Case moves to `paid` / `in_progress`.

## Entry Points

- **Public**: `/services/[slug]` → "Book this service" → `/portal/book/[slug]` (or `/booking/[slug]` for guest).
- **Portal**: `/portal` → "Book a new service" → `/services` → choose service → `/portal/book/[slug]`.

Decision: Use a single wizard at `/booking/[serviceSlug]` so both guests and logged-in users can book. Redirect to `/portal/cases` or thank-you page after submit.

## Wizard Steps (high level)

1. **Details** – Contact info (prefilled if logged in). For guests: email, name, phone required.
2. **Questions** – Dynamic form from `Service.formConfig.questions` (text, email, phone, select, checkbox, date, file).
3. **Documents** – Upload required docs per `Service.formConfig.requiredDocumentTypes` (stored temporarily then attached to Case on submit).
4. **Summary** – Review answers + docs. Show price for fixed-price; for quote-based, "You'll receive a quote within 24–48 hours."
5. **Payment** (fixed-price only) – Create Stripe PaymentIntent, confirm payment; then create Case with status `paid` (or create Case then confirm payment and update). Alternative: create Case first with status `awaiting_payment`, then on payment success webhook set `paid`.

Recommended: Create Case after payment success for fixed-price (so we don’t orphan cases if user abandons). Flow: Summary → Stripe Checkout or Elements → on success → Server Action creates Case + optional Invoice/Payment record → redirect to thank-you or portal.

Simpler variant: Always create Case at end of Summary step (status `new` or `awaiting_payment`). For fixed-price, redirect to payment page; webhook or client callback updates Case to `paid`. For quote-based, redirect to "Quote requested" page.

## Data Flow

1. **Client** (optional): Fetch `getServiceBySlug(serviceSlug)` for form config and price.
2. **Steps**: Store wizard state in React state (or URL search params). No DB until submit.
3. **Submit**: Server Action `submitBooking` (see `src/actions/booking.ts`):
   - Validates service, resolves userId (or creates guest user).
   - Generates `caseNumber`, creates Case with `formData`, status `new` or `awaiting_payment`.
   - Links any uploaded document IDs to the new Case.
   - Returns `{ caseId, caseNumber }`.
4. **Fixed-price pay-now**: Either:
   - **A)** After Case created with status `awaiting_payment`, redirect to `/booking/[slug]/pay?caseId=...` → create PaymentIntent → Stripe Elements → on success (or webhook) set Case to `paid` and create Payment record.
   - **B)** Create PaymentIntent before Case; on payment success webhook create Case + Payment (no Case if payment fails).

Current implementation uses **A**: create Case first, then pay. So booking flow: Details → Questions → Documents → Summary → [Create Case] → if fixed-price: Pay → else: Thank you.

## File Uploads

- **During wizard**: Upload to Vercel Blob (or S3) via API route `POST /api/upload`; return `{ id, url }`. Store `id` in wizard state; on submit pass `documentIds` to `submitBooking`. Action attaches documents to Case (e.g. set `caseId` on Document records created with temporary `caseId` or by ID).
- **Schema**: Document has `caseId` (required). So either: create Document with `caseId` after Case is created (in same action), or create "pending" uploads with a temporary reference and attach in action. Preferred: store uploads with a `pendingCaseToken` or in session; in `submitBooking` create Case then create Document rows with the new `caseId` and storage keys from the upload API.

## Implementation Checklist

- [ ] Wizard UI at `src/app/booking/[serviceSlug]/page.tsx` (client component with stepper).
- [ ] Step components in `src/components/booking/` (DetailsStep, QuestionsStep, DocumentsStep, SummaryStep, PaymentStep).
- [ ] Server Action `submitBooking` already creates Case; extend for document linking (e.g. accept `uploadedDocuments: { storageKey, name, documentType }[]` and create Document records with new caseId).
- [ ] Payment: Server Action `createPaymentIntent(caseId, amount)` and page `/booking/[slug]/pay?caseId=...` with Stripe Elements; webhook `payment_intent.succeeded` updates Case status and creates Payment row.
- [ ] Thank-you page: `/booking/thank-you?caseNumber=...` with next steps (portal link, or "we'll send a quote").
