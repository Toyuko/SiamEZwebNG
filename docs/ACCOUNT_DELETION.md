# Account deletion (Google Play / privacy)

## Purpose

SiamEZ provides a public, login-free account deletion URL for Google Play Console **App content → Data safety / Account deletion**, plus an authenticated in-app/portal deletion path that performs the same backend deletion.

## Public URL (production)

Enter this in Google Play Console:

```
https://siam-ez.com/en/delete-account
```

Thai locale (optional alternate):

```
https://siam-ez.com/th/delete-account
```

Local development: `http://localhost:3000/en/delete-account`

## User flows

### 1. Public request (unauthenticated)

1. User opens `/en/delete-account` or `/th/delete-account`.
2. Enters email, confirms permanence, submits.
3. `POST /api/account/deletion-request` creates an `AccountDeletionRequest` with status `PENDING`.
4. Response is **always** generic (no account enumeration):
   > If an account associated with this email exists, we will process the deletion request.
5. If a matching user exists, ops receive an email alert; the requester receives an acknowledgement email when Resend is configured.

### 2. Authenticated deletion (portal / API)

1. Signed-in user opens **Portal → Profile → Privacy**.
2. Confirms checkbox, types `Delete my SiamEZ account permanently`, and re-enters password when the account has a password.
3. `POST /api/account/delete` verifies session/Bearer + confirmation, then **immediately** executes deletion.
4. Session is signed out.

Mobile app **Profile → Delete account** opens the public web page (and still offers WhatsApp support).

### 3. Admin processing

**Admin → People → Account Deletion** (`/[locale]/admin/account-deletion-requests`)

Statuses: `PENDING` → `PROCESSING` → `COMPLETED` | `REJECTED`

Admins can process (run deletion) or reject with notes. Every step writes `AccountDeletionAuditLog`.

## API

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `POST` | `/api/account/deletion-request` | None (rate limited) | Create deletion **request** only |
| `POST` | `/api/account/delete` | Session cookie or Bearer JWT | Permanent delete for current user |

### Request bodies

**Public request**

```json
{ "email": "user@example.com", "confirmed": true, "locale": "en" }
```

**Authenticated delete**

```json
{
  "confirmPhrase": "Delete my SiamEZ account permanently",
  "password": "optional-if-password-account",
  "locale": "en"
}
```

## What is deleted vs retained

### Removed (with the User row / cascades)

- Auth: password hash, OAuth `Account`, `Session`
- Profile: name, phone, image, notification preferences, push tokens
- Freelancer profile / company profile (cascade)
- Marketplace engagement: saved listings, compares, goals, workflow runs owned by user
- Reviews involving the user (required to clear `onDelete: Restrict`)
- Jobs posted by the user (`Job.postedBy` Restrict)
- Personal follow-ups / driver-license renewals owned as client (schema Cascade)

### Anonymized / unlinked (retained for ops)

- **Cases**: `userId` set null; guest name/email/phone/formData scrubbed
- Guest cases matching the email: PII scrubbed
- **Listing enquiries**: email/name/message redacted
- **Vehicle leads**: customer contact fields scrubbed when email matches

### Retained for legal / accounting / disputes

- Invoices, payments, payment milestones
- Financial transactions and financial audit logs (`clientId` / actor SetNull)
- Case operational history (anonymized), documents attached to cases (uploader SetNull)

Staff/admin accounts cannot self-delete via this flow.

## Rate limiting & security

- Public request: 5 / hour / IP and 3 / hour / email (in-memory limiter)
- Authenticated delete: 5 / hour / IP
- No enumeration on public endpoint
- Confirmation phrase + password (when applicable) enforced server-side
- Audit log metadata must not store raw passwords or full free-text PII dumps

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ACCOUNT_DELETION_PROCESSING_DAYS` | No (default `30`) | Days shown on page/emails (1–90) |
| `ACCOUNT_DELETION_SUPPORT_EMAIL` | No | Overrides support address copy (defaults to site email) |
| `RESEND_API_KEY` | For email | Existing email stack |
| `EMAIL_FROM` | For email | Verified domain sender |
| `EMAIL_OPS_TO` | Optional | Extra ops inboxes for deletion alerts |
| `NEXT_PUBLIC_SITE_URL` / production domain | Yes | Public deletion URL base |

## Database

Migration: `prisma/migrations/20260915100000_account_deletion_requests`

Models:

- `AccountDeletionRequest`
- `AccountDeletionAuditLog`

Apply locally:

```bash
npx prisma migrate deploy
# or for cloud VM scratch DBs:
npx prisma db push
```

## Testing checklist

- [ ] `/en/delete-account` and `/th/delete-account` load without login
- [ ] Valid email + confirmation → generic success
- [ ] Invalid email → friendly error
- [ ] Rate limit returns 429
- [ ] Unknown email still returns generic success
- [ ] Portal authenticated delete requires phrase (+ password)
- [ ] Admin can list/process/reject requests
- [ ] After deletion, credentials login fails; financial rows remain with null client

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Mobile

Repo: `SiamEZappNG` — Profile delete CTA opens `{webBaseUrl}/en/delete-account`.
