# SiamEZ 2.0 — Design System

**Owner:** Agent 02 · **Branch pattern:** `agent/02-design-system`  
**Goal:** Shared tokens + primitives for later agents — expand the kit without restyling every page.

---

## Tokens

| Layer | Where | Notes |
|-------|--------|--------|
| Brand | `--siam-blue*`, `--siam-yellow*` in `src/app/globals.css` | Theme-invariant. Tailwind: `siam.blue` / `siam.yellow` (and light/dark/bright). |
| Semantic surfaces | `--background`, `--foreground`, `--muted`, `--card`, `--border`, header/input/overlay | Swap per `data-theme` (`light` \| `dark` \| `night`). |
| Feedback | `--ring`, `--destructive` | Focus rings default to brand blue. |
| Radius (CSS) | `--radius-sm` … `--radius-xl` | Documented for future use; do **not** override Tailwind `rounded-*` defaults yet. |

**Prefer:** `bg-siam-blue`, `text-muted`, `border-border`, `bg-card` over hard-coded hex.  
**Do not change** brand hex without Orchestrator sign-off.

Themes are applied by `ThemeProvider` (`src/components/theme/`) via `src/lib/theme.ts` — preserve that behavior.

---

## UI primitives (`src/components/ui/`)

| Primitive | Import | Use when |
|-----------|--------|----------|
| `Button` | `@/components/ui/button` | Actions (variants: default/primary/outline/…) |
| `Card` | `@/components/ui/card` | Interactive containers / grouped content |
| `Input` / `Select` / `Textarea` | respective files | Form controls |
| `Label` + `Field*` | `label`, `field` | Labels, required marker, description, errors |
| `Modal` | `modal` | Existing simple title+body dialogs (keep using) |
| `Dialog` | `dialog` | New composable dialogs (`Dialog` + `DialogContent` + header/footer) |
| `Sheet` | `sheet` | Slide-over drawers (filters, detail, mobile) |
| `Skeleton` | `skeleton` | Loading placeholders |
| `Table` | `table` | Data tables (admin/portal lists) |
| Motion presets | `motion` | Framer Motion variants (see below) |

Barrel re-exports: `@/components/ui` (optional; deep imports remain fine).

### Field helpers (RHF / Zod friendly)

```tsx
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

<Field>
  <FieldLabel htmlFor="email" required>Email</FieldLabel>
  <Input id="email" {...register("email")} />
  <FieldDescription>We never share your email.</FieldDescription>
  <FieldError error={errors.email?.message} />
</Field>
```

### Dialog vs Modal vs Sheet

- **`Modal`** — keep for existing call sites (title prop + `onClose`).
- **`Dialog`** — preferred for new UI: controlled `open` / `onOpenChange`, composable header/footer.
- **`Sheet`** — edge panels; `side`: `right` \| `left` \| `bottom` \| `top`.

---

## Motion (Framer Motion)

Dependency: `framer-motion`. Shared presets in `src/components/ui/motion.ts`:

| Preset | Intent |
|--------|--------|
| `fadeIn` | Soft opacity (overlays, secondary UI) |
| `fadeInUp` | Primary section / step entrance |
| `scaleIn` | Dialogs / focused confirmations |
| `staggerChildren` | Parent for staggered lists |
| `motionTransition` | Shared duration/easing |

```tsx
"use client";
import { motion } from "framer-motion";
import { fadeInUp, motionTransition } from "@/components/ui/motion";

<motion.div
  variants={fadeInUp}
  initial="hidden"
  animate="visible"
  transition={motionTransition}
>
  …
</motion.div>
```

**Guideline:** 2–3 intentional motions per visually led surface. Avoid decorative loops and competing animations.

CSS keyframes (`animate-fade-in`, etc.) in Tailwind remain available for non-JS cases.

---

## Themes

| Choice | Resolved | Look |
|--------|----------|------|
| `light` | light | White surfaces |
| `dark` | dark | Neutral slate dark |
| `night` | night | Blue-tinted dark (brand) |
| `auto` | light/dark from `prefers-color-scheme` | Does not auto-select night |

Storage key: `siam-theme`. Never remove `data-theme` / `.dark` sync in `applyTheme`.

---

## Residual gaps (later agents / P1+)

- Badge / Alert / Tabs / Tooltip / Popover
- Checkbox / Radio / Switch (native wrappers)
- Toast redesign aligned to tokens
- Input/Select migration onto semantic `--input` / `--input-border` (additive; don’t break existing gray borders yet)
- Full a11y focus-trap / focus-return for Dialog/Sheet (Radix optional)
- Visual regression snapshots (Agent 12)
- Page-level adoption of tokens/motion (owning feature agents)

---

## Acceptance checklist (A02)

- [x] Tokens documented (CSS + this file); `siam.blue` / `siam.yellow` preserved  
- [x] Dialog, Sheet, Skeleton, Field helpers, Textarea, Table added  
- [x] `framer-motion` installed + motion presets  
- [x] ThemeProvider behavior unchanged  
- [x] No booking / API / dashboard rewrites  
