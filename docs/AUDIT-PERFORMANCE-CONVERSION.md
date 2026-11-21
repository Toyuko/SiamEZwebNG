# SiamEZ Full Audit — Performance, Conversion & Feature Inventory

**Date:** 2026-11-21  
**Site:** https://siam-ez.com  
**Repo:** SiamEZwebNG (Next.js 16 App Router, Prisma/Postgres, Vercel)

This document is Phase A (audit + baseline) plus a record of Phase B–C changes applied in the same pass. Measurements below marked **BEFORE** are live production; **AFTER** requires deploy to re-measure on production.

---

## 1. Architecture snapshot

```
Browser
  → middleware (canonical host, portal/admin cookie gates, next-intl)
  → [locale] layout (fonts, i18n messages, ThemeProvider, GTM, Chatwoot)
  → (public|portal|admin|book|checkout) layouts
  → RSC pages → Server Actions / API → Prisma → Neon Postgres
  → optional: Resend, Stripe/manual pay, Vercel Blob, Pusher, Expo
```

| Area | Implementation |
|------|----------------|
| Frontend | Next.js ^16.1.6, React 18, App Router, next-intl (`en`/`th`) |
| Hosting | Vercel (`vercel.json` + `vercel-build` migrate script) |
| DB | PostgreSQL via Prisma 6 (~112 models); Case = booking unit |
| Auth | Auth.js v5 (JWT), roles: admin/staff/customer/freelancer/company |
| Booking | `/book/[slug]` WizardEngine + configs; guest bookings first-class |
| Payments | Manual PromptPay/bank/Wise default; Stripe gated by `STRIPE_ENABLED` |
| Storage | Vercel Blob |
| Admin | ~90 pages under `/admin` |

---

## 2. Baseline performance (BEFORE — production 2026-11-21)

### Server TTFB (curl, cold)

| Route | TTFB | Total | HTML size | Cache |
|-------|------|-------|-----------|-------|
| `/en` | **1.22s** | 2.16s | 316 KB | `private, no-store` / `x-vercel-cache: MISS` |
| `/en/services` | 0.97s | 1.42s | 295 KB | same |
| `/en/book/driver-license` | 0.98s | 1.43s | 158 KB | same |
| `/en/about` | 0.65s | 0.87s | 190 KB | same |

### Browser (homepage, Performance API)

| Metric | Value |
|--------|-------|
| TTFB (browser nav entry) | ~438 ms (warmer path) |
| FCP | ~1800 ms |
| DOMContentLoaded | ~2403 ms |
| Load | ~3226 ms |
| Script transfer (sample) | ~95 KB (compressed) |
| Hero assets on disk | ~1.55 MB across 10 PNGs |
| i18n catalogs | `en.json` 120 KB / `th.json` 206 KB |

### Root causes of slow page switches (measured + code)

1. **Public shell is dynamic + DB-backed** — layout awaits concierge settings + feature flags; header awaits `auth()`.
2. **Homepage write-on-read** — featured sales/RE called `updateMany` (expire boosts) before `findMany`.
3. **No `unstable_cache`** on public catalogs — every navigation re-hit Neon.
4. **10 hero images** mounted full-bleed.
5. **Header eagerly mounted cmdk search palette**.
6. **GTM injected as blocking head script**.
7. **Full message catalogs** hydrated via `NextIntlClientProvider` on every page.
8. Thin `loading.tsx` coverage (`/book` had none).

---

## 3. Dependency map (major systems)

| System | Depends on | Consumed by |
|--------|------------|-------------|
| Public marketing | Prisma services/listings, i18n, header session | Homepage, services, SEO |
| Booking wizard | Service config, Case domain, localStorage autosave | `/book/*`, checkout |
| Checkout | Invoice/Payment, guest token | Stripe or ManualCheckout |
| Portal | Session, Case/Invoice/Document | Customers / freelancers / companies |
| Admin | Staff session, all domain models | Operations |
| Concierge | Feature flags, AppSetting, LLM APIs | Public FAB + Ask buttons |
| Notifications | Resend, Pusher, Expo | Booking, chat, reminders |

---

## 4. Feature audit table

| Feature | Status | Action | Reason |
|---------|--------|--------|--------|
| Guest booking `/book/*` | KEEP | Preserve | Core revenue path |
| WizardEngine + wizard configs | KEEP / OPTIMIZE | Keep; later step-trim | Converts visitors → Cases |
| Manual checkout (PromptPay/Wise) | KEEP | Preserve | Current payment path |
| Stripe (gated) | KEEP | Leave gated | Ready when enabled |
| Public services catalog | OPTIMIZE | Cached 60s + tag invalidation | High-traffic; was uncached |
| Homepage featured boosts | OPTIMIZE | Cache + non-blocking expiry | Write-on-read slowed home |
| Public header search (cmdk) | OPTIMIZE | Lazy-mount on open | Heavy on every page |
| Hero slideshow | OPTIMIZE | Cut 10 → 3 images | LCP / bandwidth |
| GTM | OPTIMIZE | `afterInteractive` | Was head-blocking |
| Homepage CTAs | OPTIMIZE | Book + WhatsApp hierarchy | Conversion |
| Services sticky Book | OPTIMIZE | Guest `/book/driver-license` (no login wall) | Funnel friction |
| AI Concierge | KEEP / SIMPLIFY | Keep; already lazy shell | Support + discovery |
| Chatwoot | INVESTIGATE | Leave; document cost | Support; may affect nav feel |
| Marketplace (sales/RE/freelancers) | KEEP | Leave; force-dynamic later | Revenue adjacent |
| Portal goals / life events | KEEP | Soften login wall via middleware | Ops + retention |
| Admin dashboard (~90 pages) | KEEP / SIMPLIFY | Stats already parallel; no blind delete | Staff ops |
| Directory / jobs / DLT / licence verification | KEEP | Leave | Operational workflows |
| Legacy `/booking/*` redirects | KEEP | Leave | SEO / old links |
| Legacy `*BookingWizard.tsx` files | INVESTIGATE | Do not delete yet | Reference; confirm unused |
| Stats “100% success / 1000+ clients” | INVESTIGATE | Do not invent/change without source | Trust claims |
| Full i18n JSON to client | OPTIMIZE | Deferred (high effort) | Payload tax |
| `images.unoptimized` | INVESTIGATE | Billing tradeoff | Large images |
| iron-session legacy | INVESTIGATE | Confirm unused then remove | Dead code risk |

### Classification summary

- **KEEP:** Booking, payments, admin cases/clients/invoices, portal, auth, email, document upload, licence/DLT ops  
- **OPTIMIZE:** Public cache, hero, GTM, search mount, sticky CTA, homepage funnel  
- **SIMPLIFY:** Admin IA (future), concierge surface area (future)  
- **REMOVE:** None in this pass (nothing proven safe + unused without dependency check)  
- **INVESTIGATE:** Chatwoot cost, legacy wizards, trust stats, image optimizer, i18n splitting  

---

## 5. Conversion funnel (current)

```
Home (Book a Service → /services, WhatsApp secondary)
  → Services list / Service detail (Book → /book/{slug})
  → Wizard (guest OK, localStorage autosave)
  → Case created
  → Checkout (token) OR Confirmation
  → Admin Case inbox + emails
```

**Friction found:** sticky mobile Book required login; competing hero CTAs (vehicles); bottom CTA was Contact-first; guest doc uploads metadata-only (soft wall — keep for security).

---

## 6. Changes applied this pass (Phase B–C)

1. `unstable_cache` for public services, life events, featured sales/RE, concierge settings  
2. Boost expiry via `after()` (non-blocking) on sales/RE reads  
3. Feature-flag in-memory TTL 30s → 5m  
4. Hero images 10 → 3  
5. Search palette mounts only after first open  
6. GTM via `next/script` `afterInteractive`  
7. Homepage: remove duplicate `getSession`; Book + WhatsApp CTAs; bottom CTA books first  
8. Sticky bar guest booking (no login redirect)  
9. Public layout imports `LazyAiConciergeShell` directly (avoid AI barrel)  
10. `/book/loading.tsx` for faster perceived navigation  
11. `revalidateTag` on admin service create/update/delete  

---

## 7. Remaining high-value work (next 5)

1. **Split next-intl namespaces** on public pages (biggest remaining payload).  
2. **Client-side header auth island** so marketing routes can lean static/ISR.  
3. **Instrument funnel analytics** (book_start → step → checkout → paid) with drop-off dashboard.  
4. **Trim long wizards** (marriage / driver-license) using abandonment data.  
5. **Admin dashboard progressive load** (counts first; secondary widgets deferred).  

---

## 8. Security notes (no weakening)

- Guest checkout tokens retained.  
- Auth gates for portal/admin unchanged.  
- Document uploads still require auth for real Blob files.  
- Cache tags only wrap public catalogs / settings — not PII case data.  

---

## 9. Test plan after deploy

- [ ] Curl TTFB `/en`, `/en/services`, soft-nav Home→Services  
- [ ] Guest book driver-license end-to-end  
- [ ] Sticky Book on mobile services (no login wall)  
- [ ] Hero WhatsApp opens `wa.me`  
- [ ] Admin edit service → public list updates within ~60s / immediate via tag  
- [ ] `npm run typecheck` / `npm test` / `npm run build`  
