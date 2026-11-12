# AI Licence Verification Centre

SiamEZ screens Thai driving-licence documents before a quotation or invoice is created. A pass is an internal document check. It is not Department of Land Transport approval and it does not guarantee that a licence will be issued.

## What customers do

1. Open **Check documents before you book** on the driver licence service page, or go to `/en/driving-licence/apply`.
2. Choose the service. Prices come from the existing driver-licence price guide.
3. Answer the questions. The questions change for a new licence, a conversion, a renewal, a replacement, and an international permit.
4. Upload PDF, JPG, or PNG files from the tracking page. Phone photos are reduced in the browser before upload.
5. Ask SiamEZ to check the file.
6. If something is missing, expired, unreadable, or inconsistent, replace the file and check again.
7. After staff approve the file, the tracking page shows the quotation from the existing pricing engine. Accepting it creates the normal booking and invoice. Nothing is invoiced from the AI result alone.

The tracking link is the customer’s access secret, in the same way as a guest checkout link. Customers only see their own application. Staff open files through the admin document route.

## What staff do

Open **AI Licence Verification Centre** in the admin sidebar.

- Filter by date, service, nationality, status, and assessment result.
- Open an application to see the checklist beside the original file.
- Correct a misread field, then choose **Recalculate rules**. That does not call the vision model again.
- **Re-run AI** sends the stored files to the vision model again.
- **Approve for quotation** creates a quote with the existing pricing engine and emails the customer. It does not create an invoice.
- If the latest result is not a pass, approval requires a written reason. The reason is stored in the approval record and the history.
- **Reject** and **Request documents** also require a reason and email the customer.
- Assign a staff member and add internal notes. Both are written to the history.

Requirements live at **Requirements** inside the centre. Deactivate a rule when practice changes. Add a rule only with an evaluator the system already knows. An unknown evaluator is sent to staff rather than decided automatically. The default rules are an operational checklist, not a statute. Confirm them against current DLT practice and set **Last verified**.

## Quotation and invoice gate

If a case or quote is linked to a licence application, an invoice cannot be created until the application is approved, a quotation has been sent, or the booking is confirmed.

The new-invoice screen explains the block and has an override box. An override needs a reason of at least 8 characters and is written to the audit log. Bookings that are not part of this pre-check are unchanged.

## Environment

Set these on the server only. Do not expose them to the browser.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY` | Vision calls. If neither is set, screening still checks missing documents and sends the file to staff. It does not pretend the images were read. |
| `AI_GATEWAY_URL` / `OPENAI_BASE_URL` | Optional endpoint override. Same values as the concierge. |
| `AI_LICENCE_MODEL` | Vision model. Defaults to `gpt-4o-mini`. |
| `LICENCE_AI_MODE` | `mock` uses fake extractions for demos and tests. Leave unset in production. |
| `BLOB_READ_WRITE_TOKEN` | Stores uploads in Vercel Blob. Outside production, a missing or rejected token stores files in `data/licence-verification/` instead. That folder is gitignored. |
| `LICENCE_STORAGE` | Set to `local` to keep files on disk even when a Blob token is present. |
| `LICENCE_UPLOAD_MAX_BYTES` | Optional. Default 4 MB so a phone upload fits a serverless request. Maximum 15 MB. |
| `RESEND_API_KEY` and `EMAIL_FROM` | Customer emails. Without them, the notification is recorded as failed and the tracking page still shows the result. |

There is no LINE Messaging API client in this app. Customers are notified by email, by push when they have the app and have not turned document alerts off, and on the tracking page.

The installed `@vercel/blob` release only creates public blob objects. The browser never receives the blob URL. Downloads go through `/api/licence-verification/documents/[id]`, which checks staff access, the signed-in owner, or the tracking cookie. When the Blob SDK supports private objects, switch `storeLicenceFile` to that mode without changing the rest of the flow.

## Deploy

1. Apply the migration `prisma/migrations/20261112100000_licence_verification`.
2. Set the environment variables above in Vercel.
3. Deploy with the normal `npm run vercel-build` path so migrations run before the app starts.
4. Sign in as staff, open **AI Licence Verification Centre**, and confirm the requirements list is present. Missing default rules are inserted the first time the list or an assessment runs. Existing edited rules are not overwritten.
5. Submit a test application with obviously fake names. Do not use a real passport.

AI responses are validated before any status changes. If the model returns an invalid or empty payload, the application is marked for manual review after one retry.

## Administrator checklist

- A green row means the file looked acceptable.
- A yellow row needs a clearer document or a translation.
- A red row is missing, expired, or unsuitable.
- A blue row needs a person. Do not treat blue as a pass or a rejection.
- Do not tell a customer the model verified that a document is real.
- Do not send an invoice from the verification screen. The customer accepts the quotation, and the existing booking flow creates the invoice.

## DLT document package and appointments

After an application is approved, staff open **DLT Document & Appointment Centre**. Generating a package is blocked until approval. Marking it ready to print also waits for the invoice, required documents, readable files, and acknowledged AI warnings. An override needs a reason of at least 8 characters.

The master PDF is A4. SiamEZ pages carry the reference number. Customer pages are the original uploads. A JPEG is rotated only when its own orientation flag says so. Pixels, stamps, and text are not edited, and missing documents are never created.

Downloads:

- Complete package
- Cover sheet and checklists
- Each original file

Every download is written to the print record with the package version.

DLT Smart Queue (`https://gecc.dlt.go.th/webBooking/`) is the official booking channel. No third-party booking API is available, so this app does not book or confirm an appointment by itself. Staff book in Smart Queue, then save the confirmation number. The customer email is sent only after that save. The daily follow-up job also sends a reminder on the appointment day and the day before.

Offices list the licence categories they handle. A category that is not listed cannot be selected. Starter offices do not include a confirmed street address.

A visit result is stored on the application and shown on a later screening for the same customer. It does not change the pass or fail decision by itself.

Apply `prisma/migrations/20261112130000_dlt_document_centre` with the other licence migration.

