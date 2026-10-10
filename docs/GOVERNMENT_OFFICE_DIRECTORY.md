# SiamEZ Office Directory

The office directory is part of the existing SiamEZ site. Anyone can open it at `/en/directory` or `/th/directory`. Administrators manage records at `/en/admin/directory`.

It uses the current Auth.js login, Prisma, and PostgreSQL database. There is no separate app, account system, or map API key.

## Who can open it

Access is checked on the server for every page and action. Hiding a link is not the security control.

| Account | Read the directory | Suggest corrections | Edit records |
| --- | --- | --- | --- |
| Anyone, including signed out | Yes | No | No |
| Administrator | Yes | Yes | Yes |
| Staff | Yes, while the account is active | Yes | No |
| Freelancer | Yes | Only when the profile is verified and an administrator grants access | No |
| Customer or company | Yes | No | No |

Internal notes, staff tips, and reliability notes are shown only to staff, administrators, and approved freelancers. Saving a favorite requires a sign-in.

Deactivate a staff account to remove their access. For a freelancer, open **Admin → Office directory → Freelancer access** and choose **Revoke access**. Rejecting their profile or deactivating the user also removes access.

The local seed grants access to `freelancer@example.com` so the sample freelancer can sign in and try the directory. Production accounts are not granted automatically.

## What a record contains

Names, category, province, address, phones, hours, services, document notes, internal staff notes, and verification details are all optional except a name and a province. Leave unknown telephone numbers, street addresses, opening hours, and coordinates blank. Do not mark a record verified unless someone has actually checked it. Verified records need a verification date or a source URL.

Starter records shipped with the directory are names and public department homepages only. Their status is **Unverified**. They are not operational contact sheets.

## Search

The search box matches office names in English and Thai, province, district, category, attached services, phone numbers, address, and keywords. Several words must all match, so `DLT Chiang Mai` finds a Chiang Mai land-transport office only when those words are in the record. A service name matches only offices that have that service attached.

Filters cover province, district, category, service, Bangkok or other provinces, and verification status. Results are paged. The map shows offices in the current filter that have coordinates, and only after a province or search is chosen. It uses OpenStreetMap tiles in the browser. Google Maps buttons use a stored Maps link, saved coordinates, or a search for the saved address. The app does not invent coordinates and does not need a Google Maps API key.

Favorites and recently viewed offices are stored on the user account, so they follow the person between phone and computer.

## Adding and checking offices

1. Sign in as an administrator.
2. Open **Office directory** in the admin menu, then **Manage directory**.
3. Use **New office** or open an existing row.
4. Save. Unknown fields can stay empty.
5. Set the status to **Verified** only after a real check, and record the date and method.
6. **Archive** removes an office from search without deleting it. Restore it from the edit page.

**Categories and services** can be added without a code change. Attach services per office. Do not assume every office in a category offers every service.

**Reports** from staff do not change the official record. They wait under **Reports**. **Suggestions** wait under **Suggestions**. Approving a suggestion writes the change and sets the office to **Needs verification**. Approving a new office creates an unverified record.

Records that are unverified, marked needs verification, or last verified longer ago than the reminder period appear as needing a check. The default period is 90 days. Change it under **Verification settings**.

## CSV import and export

On **Import CSV**:

1. Download the template. It is UTF-8 with a byte-order mark so Excel keeps Thai text.
2. Put one office per row. Separate keywords, extra phones, and service slugs with `|`.
3. Leave unknown contact fields blank. Do not paste guessed numbers.
4. Preview the file. Fix reported cells and preview again if needed.
5. Import. Existing slugs are skipped unless **Update existing offices** is checked. Empty cells do not wipe stored values during an update.
6. A row marked verified in the file is stored as **Needs verification**. Importing is not a verification.

Export downloads the current admin filter, including internal notes and verification fields. Only administrators can import or export.

The example row `EXAMPLE-DELETE-THIS-ROW` is ignored.

## Database

The migration is `prisma/migrations/20261010190000_government_office_directory`.

Production and preview deploys already run `npm run vercel-build`, which runs `scripts/migrate-deploy.sh` before `next build`. That applies this migration to the Neon database. No new environment variable is required. The directory uses the existing `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, for migrations).

Locally:

```bash
npx prisma migrate deploy
# or, on a fresh local Postgres that cannot replay older MySQL-era migrations:
npx prisma db push
npm run db:seed
```

`db:seed` inserts categories, the service list, and starter offices when the category table is empty, and grants directory access to the sample freelancer. It does not overwrite offices that already exist. On a deployed database that has never been seeded, open the directory once while signed in as staff or an administrator. The first visit inserts the same starter set if no categories exist. Administrators can also use **Add missing starter records** later. That only fills slugs that are not already present.

Directory data lives in Postgres. It is not stored in the browser, a JSON file, or SQLite, so it survives new Vercel deployments.

## Vercel

No extra service is required. After the migration has run on the production database, authorized users open:

`https://<your-domain>/en/directory`

Sign-in uses the existing SiamEZ accounts. The pages are `noindex`. Internal notes are not returned to anonymous visitors, and there is no public write API for directory records.

If the directory page says the migration must be applied, the deploy did not finish `prisma migrate deploy`. Check the Vercel build log and `DIRECT_URL`. A stuck Prisma advisory lock is handled the same way as other migrations in this repo: terminate the backend in Neon and redeploy.

## Troubleshooting

- A freelancer sees the access-denied page: verify the profile, then grant directory access. Confirm the user is active.
- Search misses an office: the words have to appear on that office, its category name, or an attached service. Add a keyword or service instead of expecting every office in a category to match.
- The map is empty: coordinates were not entered. Use the Google Maps button with the address, then paste a confirmed Maps link or coordinates back into the record.
- CSV Thai text looks wrong: save the file as UTF-8 CSV, not UTF-16.
- Import skipped everything: those slugs already exist. Turn on update, or change the slug for a new office.
