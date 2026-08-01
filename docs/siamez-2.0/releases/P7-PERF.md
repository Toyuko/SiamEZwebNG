# P7 — Performance (A11)

**Branch:** `agent/11-performance`  
**Base:** `siamez-2.0` (P0–P6 merged)  
**Date:** 2026-08-02

## Goals

Bundle splits for heavy client surfaces, safer image usage on hot paths, App Router SEO (`sitemap` / `robots`), additive public metadata, and light Concierge a11y — without feature rewrites.

## Before

| Area | State |
|------|--------|
| Booking | Server book page eagerly imported full `WizardEngine` client tree (RHF, step renderers, documents) |
| Public LCP | `AiConciergeShell` (framer-motion, session/chat hooks) mounted in public layout SSR path |
| Admin calendar | `CalendarView` + `EventModal` statically imported with calendar page client graph |
| Admin CRUD modals | `StaffModal` / `ServiceModal` static imports on list pages |
| SEO | No `sitemap.xml` / `robots.txt` route handlers; home relied on root layout metadata only |
| Images | Several avatar/banner hot paths still used raw `<img>` |
| Concierge a11y | FAB had labels; panel close used hardcoded English; `aria-modal={false}` |

## After

### Lazy-loaded (next/dynamic)

| Surface | How |
|---------|-----|
| **WizardEngine** | Book page dynamically imports engine with a lightweight loading skeleton (SSR of loading UI kept; client chunk deferred) |
| **AiConciergeShell** | `LazyAiConciergeShell` (`ssr: false`) on public + portal layouts |
| **Admin CalendarView** | Dynamic import from calendar server page |
| **EventModal** | Dynamic import inside `CalendarView` |
| **StaffModal / ServiceModal** | Dynamic import from admin list clients |

### Images (`next/image`)

Converted where URLs are typically blob/OAuth hosts already allowlisted (or added):

- Portal `UserMenu` avatar
- Freelancer directory + public profile avatars
- Company public profile banner + logo
- Portal job detail freelancer avatar

### Raw `<img>` exceptions (intentional)

| Location | Why |
|----------|-----|
| Chat / tracking attachment previews (`ChatBox`, `ClientJobTrackingView`, `TrackingAttachmentDisplay`) | Ephemeral / blob preview URLs; unpredictable hosts |
| QR codes (`InvoiceQRCode`, `PaymentInformation`, `SalesListingBoostPanel`) | Data-URL / generated QR; `next/image` adds no value |
| `SponsoredAdBanner` | Arbitrary third-party ad creative URLs |

### SEO

- `src/app/sitemap.ts` — locale-prefixed public static routes + service detail slugs
- `src/app/robots.ts` — allow public; disallow `/admin`, `/portal`, `/api/`, `/book/`
- Home `generateMetadata` + `home.metaTitle` / `home.metaDescription` (en/th)
- Services directory already had metadata (unchanged)

### A11y (Concierge)

- Panel `aria-modal={true}`, stable `id`, labelled close via `closeLabel`
- FAB `aria-controls` + `aria-haspopup="dialog"`

## Verification

```bash
npm test && npm run typecheck
```

## Merge-ready

Yes — additive performance/SEO/a11y only; WizardEngine props/SSR contract preserved (same props, deferred client chunk).
