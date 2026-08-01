# SiamEZ 2.0 — Orchestration Pack

Incremental evolution of SiamEZwebNG into an AI-powered concierge platform.

| Doc | Purpose |
|-----|---------|
| [AUDIT.md](./AUDIT.md) | Architecture report, component inventory, technical debt |
| [ROADMAP.md](./ROADMAP.md) | Phased plan with effort, risk, acceptance criteria |
| [AGENTS.md](./AGENTS.md) | 12 specialized agent briefs + copy-paste launch prompts |
| [DEPENDENCY-GRAPH.md](./DEPENDENCY-GRAPH.md) | Mermaid graphs: booking, auth, payments, portal, admin |
| [REUSE-CATALOG.md](./REUSE-CATALOG.md) | Components / hooks / actions to prefer for 2.0 |
| [REFACTOR-BACKLOG.md](./REFACTOR-BACKLOG.md) | Prioritized refactor queue for Orchestrator |

**Canvases (open beside chat):**

- Phase 1 disposition audit — `siamez-2-phase1-analysis.canvas.tsx`
- Live orchestrator board — `siamez-2-orchestrator.canvas.tsx`

## Current gate

1. Audit — **done**  
2. Roadmap — **approved** (2026-08-01)  
3. Integration branch — `siamez-2.0`  
4. Wave 1 — A01 + A10 + A12 **merged** (P0 complete)  
5. Wave 2 — A02 Design System **merged**  
6. P2 — A05 Wizard Engine **merged**  
7. P3 — A06 Service Migration **merged** (all 13 slugs)  
8. P4 — A03 Concierge + A04 Signup **merged**  
9. P5 — A07 Documents **merged**  
10. P6 — A08 + A09 dashboards **merged**  
11. P7 — A12 release QA **merged** · **77** tests · report: [releases/SIAMEZ-2.0-RELEASE-REPORT.md](./releases/SIAMEZ-2.0-RELEASE-REPORT.md)  
12. Next — A11 performance merge · human smoke · promote (keep `BYPASS_ADMIN_AUTH` off in prod) 

Feature branches merge into `siamez-2.0` after Orchestrator review.
