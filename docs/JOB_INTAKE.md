# Job intake

Staff create a confirmed customer job from a phone at `/admin/jobs/new`. The job is a normal `Case`. It does not use a separate database, customer list, invoice engine, or financial ledger.

## Workflow

1. Staff open **+ New Job** (admin header, dashboard, service jobs, or `/admin/jobs`).
2. They enter the customer, who closed the job, who will do the work, schedule, service, price, deposit, location, and documents.
3. They review the summary and press **CREATE CONFIRMED JOB**.
4. One database transaction writes the case, sales attribution, staff assignment, invoice, deposit payment, and calendar event.
5. The success screen shows the saved invoice number and can view, download, print, share, or copy the job text.

The copy text is built from the row that was just saved, not from the unsaved form.

## Database

| Concern | Existing model | What intake stores |
| --- | --- | --- |
| Job | `Case` | Status `confirmed`, description, location, schedule, source, documents |
| Customer | `User` (`role = customer`) | Reused by email. Phone-only matches require an explicit choice. |
| Service | `Service` | Catalog id, or `serviceId = null` plus `otherServiceName` |
| Closed by | `Case.salesPersonId` | Separate from service staff. Audited on `SalesAttributionAudit`. |
| Assigned staff | `StaffAssignment` | Optional. `TBD` stores no assignment. |
| Price | `Case.dealValue` and `Invoice.amount` | Satang integers |
| Deposit | `Invoice.depositAmount` and an approved `Payment` | Cash collected is the payment, not the full price |
| Outstanding | Derived | Invoice total minus approved payments |
| Invoice | `Invoice` | `invoiceNumber` such as `INV-2026-00001`, allocated in the transaction |
| Documents to prepare | `Case.documentsRequired` (JSON list) | Names only. Uploaded files stay on `Document`. |
| Calendar | `Event` | One appointment per job, marked `[job-intake]`, updated in place |
| Double submit | `Case.intakeIdempotencyKey` | Unique. A repeat returns the first job. |

Times are entered as Asia/Bangkok wall time and stored as UTC. Thailand has no daylight-saving shift.

## Invoice

Intake uses the existing invoice PDF (`/api/admin/invoices/[id]/pdf`) and admin invoice page. The PDF still uses the SiamEZ header, payment page, and line-item table. Job intake adds schedule, staff, documents, deposit, and outstanding when those fields exist. Older invoices keep their previous layout and `INV-` plus id prefix when `invoiceNumber` is empty.

Invoice numbers are generated on the server inside the create transaction. The browser never supplies one.

## Financial reporting

Contract value is `Case.dealValue` (and the invoice total).

Collected cash is approved `Payment` rows. A ฿15,000 job with a ฿5,000 deposit records ฿5,000 paid and ฿10,000 outstanding. It does not insert a second revenue ledger row. Customer revenue in this app already comes from approved payments and closed-deal value, not from a parallel finance table.

Sales reports group by `salesPersonId` / `closedAt`. Service-delivery staff stay on `StaffAssignment` and are not treated as the closer.

## Security

Staff can add a job without an account at `/jobs/new` (for example `https://siam-ez.com/en/jobs/new`). That page does not show the admin dashboard, job list, or edit screen. Anyone with the link can submit a job, so share it only with staff. Creates and customer lookups from that page are rate-limited. Prices, staff ids, and service ids are still checked on the server.

The invoice from that page opens with a signed link on the existing PDF route. The signature only works for that intake invoice. Other invoices still require an admin or staff login.

`/admin/jobs/new` stays behind the admin layout. Update, list, and the signed-in customer lookup accept only `admin` and `staff`. Customer, freelancer, and company roles are rejected there.

## Mobile

The form is a single column with large controls, a sticky submit button, `type="date"` / `type="time"`, and email, telephone, and decimal keyboards. Share uses `navigator.share` when the phone provides it, and copies the invoice link otherwise. The invoice URL is an authenticated admin route.

## Editing

`/admin/jobs/[id]` updates the same case. It does not create another job. Schedule changes update the existing intake calendar event. Price and deposit changes update the invoice and the intake deposit payment, and a case note records the change.

## Migration

`prisma/migrations/20261003140000_job_intake` adds nullable columns and the `confirmed` case status. Existing cases are unchanged.
