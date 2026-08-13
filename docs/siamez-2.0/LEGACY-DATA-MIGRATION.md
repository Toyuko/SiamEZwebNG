# Legacy SiamEZ admin → SiamEZwebNG data migration

**Status:** Audit complete · pipeline implemented · **production import blocked** until a destination backup and explicit apply flags.  
**Date:** 2026-08-12  
**Source:** https://siam-ez.com/admin/ (read-only)  
**Destination app:** https://siam-ez.com/en/admin/dashboard  

This is **not** the Platform 2.0 listing enhancement engine (`src/lib/migration`). That tooling inventories vehicles/properties. This pipeline imports customers, jobs/bookings, and finances from the PHP admin.

---

## Safety

- Legacy PHP records are **never** created, updated, or deleted. Extract uses HTTP **GET** only.
- Destination import defaults to **dry-run**.
- `--apply` is refused unless `DATABASE_URL` is localhost **or** both `--allow-production` and `--i-understand-this-writes-to-the-destination-database` are passed.
- Current repo `DATABASE_URL` points at **Neon** (`*.aws.neon.tech`), not local Postgres. Treat that as production. Do not apply until a Neon backup exists.
- Extracted JSON contains customer PII and is gitignored under `data/legacy-extract/`.
- Passwords, API keys, and payment credentials are not read or stored.

---

## 1. Source audit (siam-ez.com/admin)

| Item | Finding |
|------|---------|
| Hosting | Apache on Webuzo. Static `index.html` + `admin.js?v=2.1` (last-modified 2026-03-17). |
| Database | Not exposed. PHP endpoints read a server-side store (typical Webuzo stack is MySQL). No SSH/DB credentials are in this repo. |
| Auth | The HTML shell is public. `api/*.php` returned JSON **without authentication** during this audit. That is a source-system security issue; lock it down after migration. This pipeline does not bypass a login — there is no API auth to use. |
| API | Relative `api/` PHP: `dashboard`, `clients`, `jobs`, `operations`, `payments`, `services`, `staff`, `calendar`, `reporting`, `assets`, `legal`. |
| Attachments | `assets.php` and `legal.php` returned **zero** files. Nothing to copy. |

### Source volumes (2026-08-12 GET)

| Entity | Count | Notes |
|--------|------:|-------|
| Clients | 58 | Integer ids 9–76. 14 have email, 44 do not. 16 have address, 7 have notes. |
| Jobs / operations bookings | 67 | **Same ids.** Jobs are the bookings. |
| Orders / payments | 67 | Same ids as jobs. Order numbers `BOOK-{id}`. Method always `manual`. |
| Services | 47 | Many duplicate name rows (Marriage Registration, Driver License, …). |
| Staff | 2 | 0 job assignments. |
| Calendar events | 1 | Linked to booking #66. |
| Quotes / invoices (legal module) | 0 | No separate quote/invoice documents. |
| Refunds / deposits / tax | 0 | Tax always 0. |

### Job statuses

`completed` 45 · `in_progress` 12 · `confirmed` 5 · `cancelled` 5

### Money (do not “fix” the legacy dashboard)

| Definition | Amount |
|------------|-------:|
| Sum of job `total_amount` | 1,735,850 THB |
| Paid orders (`payments.php?stats=summary`) | **1,698,850 THB** |
| Cancelled jobs | 37,000 THB |
| Completed jobs only (legacy **dashboard widget**) | **529,350 THB** |
| Job `cost` / dashboard `operation_costs` | 14,250 THB |
| Outstanding (no unpaid non-cancelled orders) | 0 THB |

The dashboard widget is **completed jobs only**. Payments revenue is **all paid orders**, including large in-progress jobs (398,000 and 500,000 THB). This pipeline treats **paid orders** as the financial source of truth so the new admin “Total revenue” (sum of approved `Payment.amount`) matches `payments.php`, not the old widget.

---

## 2. Destination audit (SiamEZwebNG)

| Item | Finding |
|------|---------|
| Database | PostgreSQL via Prisma (`User`, `Case`, `Quote`, `Invoice`, `Payment`, `Document`, `Event`, `CaseNote`, `StaffAssignment`, `Service`). Amounts are **satang**. |
| Customer | `User` with `role=customer`. Email unique and required. No first/last split, LINE, or country columns before this work. |
| Booking / job | A booking **is a `Case`**. Marketplace `Job` is freelancer work — not used for these PHP “Service Jobs”. |
| Finances | `Invoice` + `Payment`. No Expense model. No invoice number. New admin revenue = approved payments. |
| Existing import | Listing inventory/enhance only. No customer/job importer existed. |

Additive schema (nullable, non-destructive): `User.legacyCustomerId`, `User.legacyStaffId`, `User.address`, `User.notes`, `User.metadata`, `Case.legacyJobId`, `Case.legacyOrderNumber`, `Invoice.legacyOrderId`, `Payment.legacyOrderId`, table `legacy_id_map`.

---

## 3. Source → destination mapping

| Legacy | New | Rule |
|--------|-----|------|
| `clients.id` | `User.legacyCustomerId` | Stable key. Never join later by name/email alone. |
| `clients.name` | `User.name` + `metadata.firstName/lastName` | Split on first space. |
| `clients.email` | `User.email` | Lowercased. Missing/invalid → `legacy-customer-{id}@imported.invalid` (cannot log in until staff set a real email). |
| `clients.phone/address/notes` | `User.phone/address/notes` | As-is. LINE parsed from notes/address into `metadata.line` when present. |
| `clients.created_at` | `User.createdAt` | Preserved. |
| `staff.id` | `User.legacyStaffId` | Role `staff` or `freelancer`. No password. |
| `jobs.id` | `Case.legacyJobId` | `caseNumber` = `LEGACY-{order_number}` e.g. `LEGACY-BOOK-67`. |
| `jobs.client_id` | `Case.userId` | Via customer map. |
| `jobs.service_name` | `Case.serviceId` | Name → slug (duplicate legacy service rows collapse). Unmapped → `legacy-test-service`. |
| `jobs.status` | `Case.status` | `completed→completed`, `in_progress→in_progress`, `confirmed+paid→paid`, `cancelled→cancelled`. |
| `jobs.booking_date` | `Event` appointment | +1 hour end. |
| `jobs.notes` | `CaseNote` (internal) | Author = `migration-bot@siamez.internal`. |
| `jobs.cost` | `Case.formData.legacy.costThb` | No Expense table. |
| `orders` paid | `Invoice` paid + `Payment` approved | Amount × 100 satang. Method `manual→bank`. `idempotencyKey=legacy-order-{order_number}`. |
| `orders` cancelled | Case only | No invoice (would inflate “pending invoices” / outstanding). Amount kept on `formData`. |
| Quotes / refunds / deposits / files | — | None in source. |

Service name map: Marriage Registration, Driver License Service, Vehicle Registration, Translation Services, Police Clearence Check Full Package (typo), Visa, Car/Bike Finding/Selling, Office Services, Test Service.

---

## 4. Duplicates

Checked: legacy id, email, phone (Thai `0…` / `66…` normalized), name+phone, name+email.

Uncertain matches are **not merged**. They appear under likely duplicates / manual review. Conflicting emails keep the first real address; later rows get a synthetic email so the customer is not dropped.

Dry-run against live source + current Neon customers (email/phone only; `legacy_customer_id` column not applied yet):

- Exact email matches with destination: **0**
- Likely source duplicates (not merged): legacy customer ids **63** and **66** (same normalized name + phone)
- New customers: **58**
- Validation warnings: **44** (clients with no email received `@imported.invalid` addresses)

---

## 5. How to run

```bash
# Phase 1–5 dry-run (default). Writes PII JSON under data/legacy-extract/ (gitignored).
npm run migrate:legacy
# or
npx tsx scripts/legacy-migrate.ts all --dry-run

# After Neon backup + prisma migrate on a staging DB, then:
npx tsx scripts/legacy-migrate.ts import --apply
# Production Neon only with both flags:
npx tsx scripts/legacy-migrate.ts import --apply --allow-production --i-understand-this-writes-to-the-destination-database
```

Idempotent: second apply updates by `legacy_*` ids / payment `idempotencyKey`; it does not create duplicate customers, cases, invoices, or payments.

Apply the Prisma migration **before** `--apply`:

```bash
npx prisma migrate deploy   # or db push on a scratch DB
```

---

## 6. Access still required before production apply

| Access | Why |
|--------|-----|
| Neon backup / PITR snapshot | Required by the safety rule before destination writes. |
| Confirmation to run `--apply` against Neon | Repo `DATABASE_URL` is the production pooler. |
| Optional: MySQL dump from Webuzo | Stronger backup of the source than JSON GET. Not required for this extractor. |
| Optional: staff emails for the 44 clients without email | They cannot log in with `@imported.invalid` addresses. |

Do **not** email customers as a side effect of import. Passwords are not copied; real-email users can use forgot-password after go-live.

---

## 7. Acceptance (production apply not done)

| Criterion | Dry-run / code | Production |
|-----------|----------------|------------|
| All customers accounted for | Transform includes all 58 | Pending apply |
| All jobs/bookings accounted for | 67 cases (bookings = jobs) | Pending apply |
| Financial records | 62 paid invoices+payments; 5 cancelled cases without invoices | Pending apply |
| Relationships via legacy ids | Mapping files + `legacy_id_map` | Pending apply |
| Totals reconcile to paid orders 1,698,850 THB | Report uses that definition | Pending apply vs dashboard widget 529,350 |
| Duplicates identified, not auto-merged | Yes | — |
| Attachments migrated or documented | Zero in source | — |
| Repeatable without duplicates | Unique legacy keys | Pending second apply |
| Legacy unchanged | GET only | — |

---

## 8. Commands / files

| Path | Role |
|------|------|
| `src/lib/legacy-migration/` | Extract, map, validate, import, report |
| `scripts/legacy-migrate.ts` | CLI |
| `prisma/migrations/20260812200000_legacy_source_ids/` | Additive columns + `legacy_id_map` |
| `tests/unit/legacy-migration.test.ts` | Mapping, money, idempotent transform, report |
| `docs/siamez-2.0/LEGACY-DATA-MIGRATION-RUN.txt` | Last dry-run/apply count report (no PII) |
