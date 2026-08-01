# A06 — Service Migration (P3)

**Branch:** `agent/06-service-migration`  
**Status:** Configs + book-page wiring complete; legacy specialty UI components deprecated but not deleted.

## Migration matrix

| Slug | Status | Notes |
|------|--------|-------|
| `marriage-registration` | engine (pre-existing) | Template config |
| `police-clearance` | migrated | Generic + purpose/notes |
| `translation-services` | migrated | Generic + language fields |
| `visa-services` | migrated | Generic + visa type |
| `construction-handyman` | migrated | Generic + job fields |
| `transportation-services` | migrated | Generic + trip fields |
| `private-driver-service` | migrated | Generic + package fields |
| `event-planning-venue-services` | migrated | Preserves `eventType` / `eventDate` / `guestCount` / `venueNotes` |
| `basic-translation` | migrated | Fixed-price → checkout via `submitBooking` / `isFixed` |
| `vehicle-registration` | migrated | Booking on engine; tracking steps unchanged |
| `driver-license` | migrated | Nested `driverLicense` via `buildFormData` |
| `car-motorbike-finder-selling-service` | migrated | Nested `vehicleFinder` via `buildFormData` |
| `real-estate-services` | migrated | Nested `realEstate` via `buildFormData` |

## Engine extensions (minimal)

- `multiselect` field type
- `WizardConfig.buildFormData` for nested specialty payloads
- `documentsRequired` on documents steps
- `customValidate: "driverLicenseAppointment"` for weekday + lead-time

## Residual gaps (Orchestrator / follow-ups)

1. **`documentIds` / real file storage** — Engine and legacy both still send document *metadata* only (`documentIds: undefined`). Blob upload remains out of scope.
2. **i18n keys** — Configs expose `labelKey` where useful, but WizardEngine currently renders English `label` strings (same as A05 marriage path). Full `en`/`th` next-intl wiring for all wizard field labels is incomplete.
3. **Driver-license UX parity** — Live price summary tiles, bank/PromptPay copy, and card-style category picker are not ported; prices are still computed into `formData.driverLicense` on submit. Receipt upload remains required.
4. **Sales / RE listing CTAs** — Specialty wizards had deep-links to portal sales / real-estate when “interested in listing” was checked; engine keeps the checkbox in formData but not the inline portal CTA block.
5. **Legacy files** — `BookingWizard.tsx`, `DriverLicenseBookingWizard.tsx`, `CarMotorbikeFinderBookingWizard.tsx`, `RealEstateBookingWizard.tsx` are unused by the book page and marked `@deprecated`. Safe to delete after Orchestrator sign-off.
6. **Generic enrichment** — Generic services gained helpful optional fields (notes, purpose, etc.) beyond the old bare contact form; admin consumers should tolerate extra keys.

## Ready-to-merge checklist

- [x] All 13 seeded slugs resolve via `getWizardConfig`
- [x] Book page only mounts `WizardEngine`
- [x] Specialty nested formData transforms covered by unit tests
- [x] `npm test` / `npm run typecheck` (run on branch)
- [ ] Product QA of specialty UX residuals above
