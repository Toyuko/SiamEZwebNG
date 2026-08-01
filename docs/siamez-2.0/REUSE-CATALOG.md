# SiamEZ 2.0 — Reuse Catalog

**Status:** Current as of 2026-08-01 · **Code modified:** None  
Prefer these modules over inventing parallels. Disposition: **KEEP** (call as-is) · **EXTEND** (wrap/add) · **AVOID** (do not copy).

---

## 1. UI primitives (`src/components/ui/`)

| Module | Disposition | Use for |
|--------|-------------|---------|
| `button.tsx` | KEEP | All CTAs; CVA variants |
| `card.tsx` | KEEP | Portal/admin content containers when interaction needs a surface |
| `input.tsx` / `label.tsx` / `select.tsx` | KEEP / EXTEND | Forms; pair with RHF+Zod in new forms |
| `modal.tsx` | KEEP / EXTEND | Until A02 adds dialog/sheet |
| `dropdown-menu.tsx` | KEEP | Menus (UserMenu pattern) |
| `command.tsx` | KEEP | Command palettes; Concierge quick-pick |
| `stepper.tsx` | KEEP | Wizard progress (all booking wizards) |
| `toast.tsx` | KEEP | Action feedback |

**A02 owns expansion** (dialog, sheet, form wrappers, skeleton, table). Other agents consume, do not fork primitives.

---

## 2. Booking & wizard

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `submitBooking` | `actions/booking.ts` | **KEEP — canonical write** | Only booking mutation entry for wizards / Concierge handoff |
| `createBookingCase` | `lib/domain/cases.ts` | KEEP | Fixed invoice + marketplace side effects |
| `clientDetailsSchema` | `lib/booking-schema.ts` | EXTEND | Add step Zod schemas for JSON engine |
| `Stepper` | `components/ui/stepper.tsx` | KEEP | Engine progress UI |
| `MarketplacePostToggle` | `components/booking/MarketplacePostToggle.tsx` | KEEP | Shared across wizards |
| `BookingWizard` + specialty wizards | `components/booking/*` | AVOID copy | Migrate via P2/P3 engine; keep until parity |
| `getOrEnsureServiceBySlug` | `data-access/service.ts` | KEEP | Book page + portal book |
| Job tracking steps config | `config/job-tracking-steps.ts` | KEEP | Driver-license / vehicle tracking UI |

**Contract for P2 engine:** same `SubmitBookingInput` shape → same Case/Invoice outcomes. Do not bypass `submitBooking`.

---

## 3. Auth & session

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `auth` / `signIn` / `signOut` | `auth.ts` | KEEP | Auth.js v5 |
| `getSession`, `requireAuth`, `requireStaff`, `requireFreelancer`, `requireCompany` | `lib/auth.ts` | **KEEP — prefer these** | All new Server Actions |
| `register` / `logout` | `actions/auth.ts` | KEEP | Guest case linking on customer register |
| API JWT helpers | `lib/auth/api-jwt.ts`, `getApiUser.ts`, `resolveApiUserId.ts` | KEEP | Mobile APIs |
| `requireApiFreelancer` / `requireApiCompany` | `lib/auth/*` | KEEP | Role-scoped API |
| `auth-redirect` | `lib/auth-redirect.ts` | KEEP | Post-login routing |
| `lib/session.ts` (iron-session) | — | **AVOID** | Unused |

---

## 4. Payments & checkout

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `createPaymentIntent` | `actions/payment.ts` | KEEP | Guest token + session |
| `submitPaymentWithProof` | `actions/payment.ts` | KEEP | Manual methods |
| `submitUserPayment` | `lib/domain/payments.ts` | KEEP | Domain write |
| `PaymentProvider` + ManualProvider | `lib/payments/*` | KEEP | QR / bank / Wise |
| `CheckoutForm` | `components/checkout/CheckoutForm.tsx` | KEEP | Stripe Elements |
| `PaymentInformation` | `components/payment/PaymentInformation.tsx` | KEEP | Manual instructions UI |
| `InvoiceQRCode` | `components/payments/InvoiceQRCode.tsx` | KEEP | PromptPay-style QR |
| `getStripe` / webhook | `lib/stripe.ts`, `api/stripe/webhook` | KEEP | No new providers in 2.0 |
| Admin payment settings | `actions/admin` + `lib/payment-settings.ts` | KEEP | Ops config |

**Rule:** Concierge/docs agents must not add Omise/Stripe forks; call existing actions.

---

## 5. Documents & uploads

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `uploadAndCreateDocument` | `lib/domain/documents.ts` | **KEEP — canonical** | Blob + Document row |
| `adminUploadDocumentAction` | `actions/document.ts` | KEEP | Staff path (auth-aware) |
| `ClientDocumentUpload` | `components/client/ClientDocumentUpload.tsx` | EXTEND | Portal + P5 upload UX |
| Chat/tracking validators | `lib/uploads/chat-attachment.ts`, `tracking-attachment.ts` | KEEP | Purpose-scoped MIME/size |
| `POST /api/upload` | `app/api/upload/route.ts` | EXTEND carefully | General/sales path still open — P0 |
| `uploadDocumentMetadataAction` | `actions/document.ts` | EXTEND | Needs auth before Concierge tools |

---

## 6. Portal shell & role UX

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| Portal layout client + sidebar | `(portal)/PortalLayoutClient`, `layout/PortalSidebar` | KEEP | Role nav |
| `SummaryCard`, `ActivityFeed`, `PortalTopBar`, `UserMenu`, `LanguageSwitcher`, `PortalFooter` | `components/portal/*` | KEEP / EXTEND | Dashboard building blocks |
| `getRecentActivityForUser` | `data-access/activity.ts` | KEEP | Feed data |
| Case/invoice/document DA | `data-access/case|invoice|document` | KEEP | Portal lists |
| Freelancer feed / active jobs | `FreelancerJobFeed`, `ActiveJobsTrack`, etc. | KEEP | Marketplace UX |
| `CompanyDashboardClient` | `components/company/*` | KEEP | Company home |
| `ClientJobTrackingView`, timeline, approval banner | `components/client/*` | KEEP | Tracking |
| `ChatBox` | `components/jobs/ChatBox.tsx` | KEEP | Job chat |
| `use-job-channel` | `hooks/use-job-channel.ts` | KEEP | Pusher |
| `portal-settings` actions | `actions/portal-settings.ts` | KEEP | Prefs |

---

## 7. Admin shell & ops

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `AdminSidebar` | `components/layout/AdminSidebar.tsx` | KEEP | Nav |
| Admin layout role gate | `(admin)/layout.tsx` | KEEP | + bypass env |
| `actions/admin.ts` | — | EXTEND after P0 | Prefer adding guards, not a second admin module |
| Invoice wizard actions | `actions/invoice.ts` | KEEP | Already `requireStaff` |
| `AdminAutoApprovalTimer` | `components/admin/*` | KEEP | Job ops |

---

## 8. Services discovery (Concierge precursors)

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `ServiceCommandPalette` | `components/services/ServiceCommandPalette.tsx` | **KEEP — Concierge seed** | cmdk UX |
| `useServiceFuseSearch` | `hooks/useServiceFuseSearch.ts` | KEEP | Fuzzy search |
| `useVoiceRecognition` | `hooks/useVoiceRecognition.ts` | KEEP | Voice-ready for A03 |
| `service-search.ts` / catalog configs | `config/service-search.ts`, `service-catalog.ts`, `services.ts` | EXTEND → SSOT | Drift risk; unify carefully |
| `WhatsAppFloat` | `components/sections/WhatsAppFloat.tsx` | EXTEND pattern | FAB placement for Concierge |
| Service grids (`ServiceGrid`, `ServicesGrid`, `ServiceDirectoryGrid`) | `components/sections|services` | AVOID duplicating | Pick one pattern for new UI |

---

## 9. Theme, i18n, layout

| Module | Path | Disposition | Notes |
|--------|------|-------------|-------|
| `ThemeProvider` / `ThemeSwitcher` / `theme.ts` | `components/theme/*`, `lib/theme.ts` | KEEP | light/dark/night |
| next-intl routing | `i18n/*`, `messages/*` | KEEP | en + th required |
| `PublicHeader` / `PublicHeaderWithAuth` / `PublicFooter` | `components/layout/*` | KEEP | Marketing shell |
| `cn` / `formatCurrency` / `nextCaseNumber` | `lib/utils.ts` | KEEP | Shared helpers |
| Brand tokens | Tailwind `siam.blue` / `siam.yellow`, `globals.css` | KEEP | A02 only expands |

---

## 10. Data-access & domain (write boundaries)

**Prefer domain + data-access over raw Prisma in new UI code.**

| Domain | Path | Canonical for |
|--------|------|---------------|
| Cases | `lib/domain/cases.ts` | Booking case create, user case reads, status |
| Documents | `lib/domain/documents.ts` | Upload + metadata |
| Payments | `lib/domain/payments.ts` | User payment submit |
| Invoices | `lib/domain/invoices.ts` | Invoice domain ops |
| Marketplace jobs | `lib/domain/marketplace-jobs.ts` | Post from booking |
| Services | `lib/domain/services.ts` | Service rules |

Data-access wrappers: `src/data-access/{case,invoice,payment,document,service,user,job,marketplace-job,activity,...}.ts`.

---

## 11. Hooks summary

| Hook | Reuse |
|------|--------|
| `useServiceFuseSearch` | Concierge + service search |
| `useVoiceRecognition` | Concierge voice |
| `use-job-channel` | Job realtime |
| `use-focus-trap` | Modals/dialogs a11y |

---

## 12. Do-not-duplicate checklist

1. **No second booking submit** — always `submitBooking` / `createBookingCase`.
2. **No second auth helper layer** — use `lib/auth.ts` (not iron-session).
3. **No new payment provider package** — extend `PaymentProvider` only if Orchestrator approves.
4. **No fourth service grid** — reuse directory/command palette patterns.
5. **No copy-paste specialty wizard** — JSON engine (P2) instead.
6. **No unguarded Server Action** for mutations — wrap with `requireAuth` / `requireStaff`.

---

## Quick “start here” by agent

| Agent | Start from |
|-------|------------|
| A02 Design | `components/ui/*`, `lib/theme.ts`, `globals.css` tokens |
| A03 Concierge | `ServiceCommandPalette`, Fuse hook, voice hook, WhatsAppFloat placement |
| A05 Wizard | `Stepper`, `booking-schema`, `submitBooking`, book page switch |
| A07 Documents | `uploadAndCreateDocument`, `ClientDocumentUpload`, upload validators |
| A08 Portal | `components/portal/*`, data-access case/invoice/document |
| A09 Admin | `AdminSidebar`, guarded admin actions after P0 |
| A10 Security | `lib/auth.ts`, `actions/case.ts`, `actions/admin.ts`, `/api/upload` |
