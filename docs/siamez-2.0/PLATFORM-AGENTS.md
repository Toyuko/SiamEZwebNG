# Platform 2.0 — Agent briefs (M0–M7)

Shared rules: TypeScript · preserve cuid listing URLs · never overwrite listing `description` by default · reuse Case/Wizard/Concierge · commit on `agent/mN-*` · `npm test && npm run typecheck`.

---

## M-01 / M-02 — Migration Engine (Wave M0) — ACTIVE

### Launch prompt
```
You are Platform agents M-01 + M-02 for SiamEZ Platform 2.0 Wave M0.

Repo: /Users/Microsoft/Documents/Github/SiamEZwebNG
Base: latest siamez-2.0
Branch: agent/m0-migration-engine
Isolated worktree.

## Mission
1. Create src/lib/migration/** Migration Engine scaffold:
   - analyzePublishedListings() for SalesVehicle + SalesProperty
   - dry-run inventory report writer → docs/siamez-2.0/migrations/ (timestamped MD)
   - non-destructive: NO updates/deletes to listing source fields
   - types for ListingSnapshot, MigrationReport
2. Optional CLI: scripts/migrate-inventory-report.ts (tsx) that prints/writes report
3. Unit tests:
   - URL contract helpers: public path builders for /sales/[id] and /real-estate/[id] MUST use id (cuid), never slug
   - migration dry-run does not call prisma update/delete (mock)
4. Document usage in docs/siamez-2.0/migrations/README.md

## Constraints
- Do NOT change Prisma schema in M0 (enhancement tables are M1)
- Do NOT modify sales/RE page UI
- Do NOT delete listings or media
- Read docs/siamez-2.0/PLATFORM-MIGRATION-REPORT.md and PLATFORM-ROADMAP.md

## Acceptance
- npm test && npm run typecheck green
- Inventory report can be generated (works with empty DB / mocked prisma)
- Merge-ready summary for Orchestrator
```
