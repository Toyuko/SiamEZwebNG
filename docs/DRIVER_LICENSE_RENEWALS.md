# Driver's License Renewal Follow-Up System

SiamEZ tracks Thai driver's license renewals after a DL service is completed, emails customers **one calendar month** before the next renewal, and gives staff a dedicated admin board.

## Data model

### `DriverLicenseRenewal`

Specialty record linked to:

- `User` (`clientId`) — customer in the existing client database
- `Case` (`caseId`, optional)
- `FollowUp` (`followUpId`, optional) — generalized follow-up engine (reminders / calendar)

Key fields:

| Field | Meaning |
|-------|---------|
| `renewalType` | `DRIVER_LICENSE_2_TO_5` or `DRIVER_LICENSE_5_TO_5` |
| `issueDate` | **New** license issue date (staff-recorded) |
| `expiryDate` | **New** license expiry (source of truth) |
| `nextRenewalDate` | Same as expiry (when they renew next) |
| `reminderDate` | Exactly 1 calendar month before `nextRenewalDate` |
| `status` | `UPCOMING` → `REMINDER_DUE` → `REMINDER_SENT` → `CONTACTED` / `RENEWED` / `CANCELLED` / `NOT_INTERESTED` |
| `reminderSentAt` / `reminderSendMethod` | Duplicate-send guard (`AUTOMATIC` \| `MANUAL`) |

Historical renewals are **never overwritten** — each completion creates a new row.

### Activity log

`DriverLicenseRenewalActivity` records create/update/send/fail/status changes for audit.

## Date calculation

Implemented in `src/lib/driver-license-renewal/dates.ts` (calendar-aware, no `30 * 24 * 60 * 60 * 1000`).

Rules:

1. Prefer staff-entered **New License Expiry Date**.
2. If only issue date is entered, expiry = issue + **5 years** (both 2→5 and 5→5 issue a 5-year license).
3. Reminder = subtract **1 calendar month** from next renewal (handles month-ends / leap years).
4. “Today” for cron/due logic uses **Asia/Bangkok**.

Example: renew on 15 Sep 2026 → expiry 15 Sep 2031 → reminder 15 Aug 2031.

## Admin UI

| Route | Purpose |
|-------|---------|
| `/admin/driver-license-followups` | List, filters, stats |
| `/admin/driver-license-followups/[id]` | Detail, actions, activity |
| `/admin/clients/[id]/edit` | Client “Driver's License” section + history |
| `/admin/cases/[id]` | “Set Driver's License Follow-Up” on DL cases |
| `/admin/dashboard` | Clickable DL stats |

Staff actions: send reminder, send **test** reminder, mark contacted/renewed/cancelled/not interested, reschedule.

## Email

- Provider: existing **Resend** stack (`src/lib/email/*`)
- Template: `sendDriverLicenseRenewalReminderEmail` (bilingual EN/TH)
- Subject: `Your Thai Driver's License Renewal is Coming Up – SiamEZ`
- Skips when: no email, cancelled/renewed/not interested, already sent, opt-out (`emailRenewalReminders` / `emailFollowUpReminders`)
- **Test** emails set `isTest: true` and do **not** set `reminderSentAt`

## Cron / automation

| Endpoint | Schedule |
|----------|----------|
| `/api/cron/followup-reminders` | Daily `0 2 * * *` (Vercel) — generalized + DL processors |
| `/api/cron/driver-license-reminders` | Manual DL-only trigger (same `CRON_SECRET`) |

Auth (both):

```http
Authorization: Bearer ${CRON_SECRET}
```

### Local manual trigger

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/driver-license-reminders"
```

### Deploy

1. Ensure `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` are set in Vercel.
2. Deploy; Vercel registers crons from `vercel.json`.
3. Confirm the cron runs in Vercel → Project → Crons / logs.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `CRON_SECRET` | Yes (prod) | Bearer token for cron routes |
| `RESEND_API_KEY` | Yes (to send) | Without it, sends are skipped safely |
| `EMAIL_FROM` | Recommended | Verified Resend from-address |
| `DATABASE_URL` / `DIRECT_URL` | Yes | Prisma + migrate |

## Migrations

```bash
npx prisma migrate deploy
# or local:
npx prisma db push
npx prisma generate
npm run db:seed   # includes DL demo customers A–E
```

Migrations:

- `20260913140000_driver_license_renewals`
- `20260913160000_generalized_follow_ups` (adds `follow_up_id` link)

## Testing

```bash
npm test -- tests/unit/driver-license-renewal-dates.test.ts
npm test -- tests/unit/driver-license-renewal-reminders.test.ts
npm test -- tests/unit/driver-license-cron-auth.test.ts
npm test -- tests/unit/driver-license-portal-access.test.ts
```

Admin UI: open a seed renewal → **Send test reminder** (does not mark production as sent).

## Customer portal

Customers see non-sensitive license expiry / next renewal on `/portal` when they have active renewals. Internal notes are never exposed.
