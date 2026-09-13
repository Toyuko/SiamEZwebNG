# Generalized Client Follow-Up System

Reusable follow-up engine for all SiamEZ services (renewals, check-ins, quotes, document requests, sales, etc.). Driver's license renewals are a specialization that links into this engine.

## Data model

### `FollowUp`
Core record linked to `User` (client), optional `Case`, optional `Service`.

| Field | Notes |
|-------|--------|
| `followUpType` | CUSTOM, CLIENT_CONTACT, DOCUMENT_REQUEST, PAYMENT, SERVICE_COMPLETION, RENEWAL, REVIEW, CHECK_IN, SALES, QUOTE, APPOINTMENT, OTHER |
| `status` | PENDING, DUE, IN_PROGRESS, COMPLETED, CANCELLED, SNOOZED |
| `priority` | LOW, NORMAL, HIGH, URGENT |
| `dueDate` | Calendar date (`@db.Date`) |
| `emailReminderDate` | When cron may send (defaults to due date) |
| `reminderStatus` | NONE, SCHEDULED, SENT, FAILED, SKIPPED |
| `metadata` | Domain extras (e.g. DL renewal type) |

### `FollowUpTemplate`
Reusable timing + email defaults. Supports relative delays (days/weeks/months before/after) and triggers (`CASE_COMPLETED`, `QUOTE_SENT`, `SERVICE_COMPLETED`, `EXPIRY_DATE`, `MANUAL`).

### `FollowUpActivity`
Timeline of creates, status changes, snoozes, email sends/failures.

### `DriverLicenseRenewal`
Keeps license-specific fields (`issueDate`, `expiryDate`, `renewalType`, …) and links via `followUpId` to a `FollowUp` with `followUpType = RENEWAL`.

## Date calculation

Use calendar-aware helpers in `src/lib/follow-ups/dates.ts` — never fixed millisecond offsets.

```ts
applyRelativeDate({
  anchor: "2031-09-15",
  value: 1,
  unit: "MONTHS",
  direction: "BEFORE",
}); // → 2031-08-15
```

Supports days/weeks/months before or after, leap years, and month-end clamping.

## Email reminders

- Uses existing Resend stack (`sendFollowUpReminderEmail` in `src/lib/email/messages.ts`).
- Honors `User.notificationPreferences.emailFollowUpReminders` / `emailRenewalReminders`.
- Duplicate prevention via `reminderSentAt` (manual send can `force`).
- Send method recorded as `MANUAL` or `AUTOMATIC`.

Default subject: `SiamEZ Follow-Up – [Title]`

## Cron

```
GET /api/cron/followup-reminders
Authorization: Bearer ${CRON_SECRET}
```

Schedule (Vercel): daily `0 2 * * *` in `vercel.json`.

Also processes any legacy unlinked DL renewals. Older path `/api/cron/driver-license-reminders` aliases to this endpoint.

## Admin UI

| Route | Purpose |
|-------|---------|
| `/admin/followups` | Dashboard, filters, table, calendar |
| `/admin/followups/[id]` | Detail + activity |
| `/admin/followups/templates` | Template CRUD |
| `/admin/clients/[id]` | Client profile Follow-Ups section |

Case detail: **Create Follow-Up** when near completion. Completing a case auto-applies matching `autoApply` templates (`CASE_COMPLETED` / `SERVICE_COMPLETED`).

## Driver's license integration

1. Staff records issue + expiry (expiry is source of truth).
2. System creates `DriverLicenseRenewal` + linked `FollowUp` due **one calendar month before expiry**.
3. Reminders / assignment / status / activity run through `FollowUp`.

Renewal types: `DRIVER_LICENSE_2_TO_5`, `DRIVER_LICENSE_5_TO_5`.

## Adding a new service follow-up template

1. Admin → Follow-ups → Templates → create.
2. Set service (or leave global), type, delay (e.g. 7 days after), trigger, email copy.
3. Enable **Auto-apply** if it should fire on case completion / quote sent.
4. No code changes required for the engine.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `CRON_SECRET` | Yes (prod cron) | Bearer token for cron routes |
| `RESEND_API_KEY` | For email | Skips send if unset |
| `EMAIL_FROM` | For email | Verified Resend domain |
| `DATABASE_URL` / `DIRECT_URL` | Yes | Prisma |

## Local testing

```bash
npx prisma migrate deploy   # or db push
npx prisma generate
npm run db:seed
npm test -- tests/unit/follow-ups.test.ts

# Simulate cron
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/followup-reminders
```

## Production deployment

1. Deploy migration `20260913160000_generalized_follow_ups`.
2. Ensure `CRON_SECRET`, Resend env vars on Vercel.
3. Confirm cron appears in Vercel project → Crons.
4. Smoke-test: create follow-up in admin, send manual reminder, verify activity log.

## Key source files

- `src/lib/follow-ups/*` — engine
- `src/lib/driver-license-renewal/*` — DL specialty
- `src/actions/follow-ups.ts` — staff server actions
- `src/app/api/cron/followup-reminders/route.ts`
- `src/app/[locale]/(admin)/admin/followups/*`
