# SiamEZ SEO & Google Ads Launch

Production site: https://siam-ez.com/en/

This document distinguishes **IMPLEMENTED** (in the codebase) from **REQUIRES MANUAL GOOGLE SETUP**.

---

## 1. SEO implementation summary — IMPLEMENTED

- Unique titles, meta descriptions, canonicals, Open Graph, Twitter cards, and `hreflang` (`en` / `th` / `x-default`) on public pages via `src/lib/seo/`.
- Service pages use dedicated SEO titles in the form `Thai Driver's License Service in Thailand | SiamEZ`.
- Homepage H1: **Thailand services made easy**.
- JSON-LD: Organization, ProfessionalService (LocalBusiness), WebSite, WebPage, BreadcrumbList, Service, FAQPage. No invented ratings, reviews, or prices except DB/catalog amounts already shown on the page.
- Sitemap: `/sitemap.xml` (locale pairs + all 13 services + published listings). Excludes book, checkout, portal, admin, auth.
- Robots: `/robots.txt` disallows admin, portal, API, book, booking, checkout, login, register, password reset.
- Booking / checkout / portal / admin / auth are `noindex`.
- Custom 404 with Home, Services, booking, and AI Concierge CTAs.
- Internal links: related services, About service list, coverage section, booking CTAs.
- Location copy is nationwide (“Serving customers across Thailand”) with a Bangkok office address. No doorway city pages.
- Legacy `/thailicense.html` 301s to `/en/services/driver-license`.
- Default Open Graph image: `/opengraph-image`.
- Audit: `npm run seo:audit` and `tests/unit/seo.test.ts`.

Canonical host is `https://siam-ez.com` (`NEXT_PUBLIC_SITE_URL` in production). Preview deployments use the Vercel preview URL when that variable is unset.

Set `NEXT_PUBLIC_NOINDEX=true` on any non-production environment that must stay out of Google.

---

## 2. Important URLs

| Page | URL |
|------|-----|
| Home | `/en/` |
| Services directory | `/en/services` |
| Driver's license | `/en/services/driver-license` |
| Vehicle registration | `/en/services/vehicle-registration` |
| Visa services | `/en/services/visa-services` |
| Translation & legalization | `/en/services/translation-services` |
| Police clearance | `/en/services/police-clearance` |
| Marriage registration | `/en/services/marriage-registration` |
| Basic translation | `/en/services/basic-translation` |
| Construction & handyman | `/en/services/construction-handyman` |
| Real estate services | `/en/services/real-estate-services` |
| Car & motorcycle finder | `/en/services/car-motorbike-finder-selling-service` |
| Transportation | `/en/services/transportation-services` |
| Private driver | `/en/services/private-driver-service` |
| Event planning | `/en/services/event-planning-venue-services` |
| Cars for sale | `/en/sales` |
| Real estate listings | `/en/real-estate` |
| About | `/en/about` |
| Contact | `/en/contact` |
| Book (noindex) | `/en/book/{slug}` |

Thai equivalents use `/th/` instead of `/en/`.

---

## 3. Sitemap URL — IMPLEMENTED

https://siam-ez.com/sitemap.xml

---

## 4. Robots URL — IMPLEMENTED

https://siam-ez.com/robots.txt

---

## 5. Canonical strategy — IMPLEMENTED

- Locale prefix is always present (`/en/...`, `/th/...`).
- Canonicals omit query strings and trailing slashes.
- `hreflang` points at the matching path in `en` and `th`; `x-default` is English.
- Booking, checkout, portal, admin, and auth are noindex and omitted from the sitemap.

---

## 6. Structured-data strategy — IMPLEMENTED

Reusable builders live in `src/lib/seo/jsonld.ts` and `src/components/seo/JsonLd.tsx`.

| Type | Where |
|------|--------|
| Organization + ProfessionalService + WebSite | All pages (locale layout) |
| WebPage + BreadcrumbList | Home, contact, service detail |
| Service + FAQPage | Service detail |
| ItemList + Service | `/services` directory |
| Product/Vehicle / RealEstateListing | Marketplace detail (existing) |

Do not add AggregateRating unless a verified live rating is shown on the same page.

---

## 7. Google Analytics setup — REQUIRES MANUAL GOOGLE SETUP

1. Create a GA4 property.
2. Either:
   - **Preferred:** put GA4 inside Google Tag Manager, then set `NEXT_PUBLIC_GTM_ID` (e.g. `GTM-XXXX`) in Vercel; or
   - Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-XXXX`) **only if GTM is not used** (the app will not load both).
3. Optional: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for Search Console HTML-tag verification.
4. Redeploy after env vars are set.

`window.dataLayer` is initialized even before GTM so `trackEvent()` is not a no-op.

---

## 8. Google Tag Manager setup — REQUIRES MANUAL GOOGLE SETUP

1. Create a GTM container.
2. Add GA4 Configuration tag → `dataLayer`.
3. Add Google Ads Conversion Linker.
4. Create Custom Event triggers for the event names in section 9.
5. Map each conversion to a Google Ads conversion action.
6. Set `NEXT_PUBLIC_GTM_ID` on Vercel Production (and Preview only if you want test traffic).

---

## 9. Google Ads conversion events — IMPLEMENTED (client dataLayer)

| Event | Where it fires | Suggested Ads use |
|-------|----------------|-------------------|
| `service_viewed` | Service detail page mount | Micro conversion / remarketing |
| `service_book_click` | Directory cards, sticky bar, service sidebar | Funnel |
| `booking_started` | Booking wizard mount (`/book/{slug}`) | Funnel |
| `booking_completed` | Successful booking submit (before redirect) | **Primary conversion** |
| `quote_requested` | Smart quote generated in wizard | Secondary |
| `contact_submitted` | Contact form success | Secondary conversion |
| `listing_enquiry_submitted` | Vehicle/property enquiry success | Secondary |
| `payment_completed` | `/checkout/success` | Purchase (fixed-price) |
| `phone_clicked` | Footer, contact, service sidebar | Call conversion |
| `email_clicked` | Footer, contact | Secondary |
| `line_clicked` | Footer, contact, service sidebar, directory | Secondary |
| `whatsapp_clicked` | Footer, service sidebar | Secondary |
| `ai_concierge_started` | First Concierge panel open | Micro |
| `ai_concierge_lead` | First user message in Concierge | Secondary |
| `service_search` / `service_filter_click` / `service_card_view` / `service_details_click` | Services directory | Diagnostics |

Do not create two GTM tags that both fire `booking_completed`.

---

## 10. Recommended Google Ads landing pages

Use existing service pages (do not create thin keyword duplicates):

1. `/en/services/driver-license`
2. `/en/services/marriage-registration`
3. `/en/services/translation-services`
4. `/en/services/police-clearance`
5. `/en/services/vehicle-registration`
6. `/en/services/car-motorbike-finder-selling-service`
7. `/en/services` (generic / competitor campaigns)
8. `/en/contact` (call-only / LINE campaigns)

Final URL should include the locale prefix. Final URL suffix can carry `utm_*` / `gclid`; canonicals ignore query params.

---

## 11. Recommended initial campaign structure

See also `SEO-KEYWORD-MAP.md`. Keep this to high-intent commercial searches:

1. Thailand Driver's License
2. Marriage Registration Thailand
3. Translation & Legalization Thailand
4. Police Clearance Thailand
5. Vehicle Registration Thailand
6. Car & Motorcycle Finder Thailand

Optional later: Visa Services, Real Estate, Private Driver, branded SiamEZ.

---

## 12. Launch checklist

### IMPLEMENTED in code

- [x] Titles, descriptions, canonicals, OG/Twitter
- [x] Sitemap + robots
- [x] JSON-LD
- [x] Service landing content (who / where / FAQ / related / CTAs)
- [x] Conversion `dataLayer` events
- [x] 404 page
- [x] noindex on private flows
- [x] Coverage copy (Thailand-wide, Bangkok office)

### REQUIRES MANUAL GOOGLE SETUP

- [x] Canonical production host `https://siam-ez.com` (also set `NEXT_PUBLIC_SITE_URL` / `AUTH_URL` on Vercel Production)
- [ ] Set `NEXT_PUBLIC_GTM_ID` (or GA4 id)
- [ ] Google Search Console: add property, verify, submit sitemap
- [ ] Google Analytics 4: property + GTM tag
- [ ] Google Ads: conversion actions mapped to `booking_completed`, `contact_submitted`, `phone_clicked`, `line_clicked`
- [ ] Google Ads: campaigns → landing pages above
- [ ] Google Business Profile: confirm NAP matches `src/config/site.ts`
- [ ] Vercel: production env vars + custom domain HTTPS
- [ ] Legal review of Privacy / Terms / Refund (pages exist but are short)

---

## 13. Post-launch monitoring checklist

- Search Console: coverage, canonical conflicts, mobile usability, Core Web Vitals
- Ads: conversion volume vs clicks; import `booking_completed` as primary
- `npm run seo:audit https://YOUR-DOMAIN`
- Spot-check `/en`, `/th`, each major service, `/book/driver-license` (should be noindex), contact form, LINE/phone clicks in GTM preview
- Confirm AI Concierge conversations are not public URLs (they are not)

---

## Legal / trust TODO (do not invent copy)

Privacy, Terms, and Refund pages exist and are linked from the footer. They are short. A lawyer should expand them before treating them as complete booking terms. Do not fabricate licenses, awards, or review scores in schema.
