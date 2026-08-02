# SiamEZ 2.0 — Orchestration Pack

Incremental evolution of SiamEZwebNG into an AI-powered concierge platform.

| Doc | Purpose |
|-----|---------|
| [AUDIT.md](./AUDIT.md) | Architecture report, component inventory, technical debt |
| [ROADMAP.md](./ROADMAP.md) | UX/Concierge phases P0–P7 (delivered on branch) |
| [PLATFORM-MIGRATION-REPORT.md](./PLATFORM-MIGRATION-REPORT.md) | Marketplace content inventory — preserve-first |
| [PLATFORM-ROADMAP.md](./PLATFORM-ROADMAP.md) | Waves M0–M7 (Life Events, search, recs, workflows) |
| [PLATFORM-2.1-AUDIT.md](./PLATFORM-2.1-AUDIT.md) | Platform 2.1 health audit (Phases 1–9 complete) |
| [PLATFORM-2.1-SECURITY.md](./PLATFORM-2.1-SECURITY.md) | Security review (auth, rate limits, uploads, DR) |
| **Guides** | |
| [guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md) | System architecture (Next.js 16, engines, Mermaid) |
| [guides/API.md](./guides/API.md) | Server Actions + `/api/v1` route map |
| [guides/WORKFLOWS.md](./guides/WORKFLOWS.md) | Universal Workflow Engine vs WizardEngine |
| [guides/MARKETPLACE.md](./guides/MARKETPLACE.md) | Automotive + property, engagement, 2.1 features |
| [guides/ADMIN.md](./guides/ADMIN.md) | Staff work queue, analytics, feature flags |
| [guides/DEVELOPER.md](./guides/DEVELOPER.md) | Local setup, commands, ownership rules |
| [AUDIT-IMPLEMENTATION.md](./AUDIT-IMPLEMENTATION.md) | CTO audit priorities implemented (P0–P3) |
| [API-CONTRACTS.md](./API-CONTRACTS.md) | App 2.0 / agent API contract map |
| [AGENTS.md](./AGENTS.md) | 12 specialized agent briefs (P0–P7) |
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
11. P7 — A11 Performance + A12 Release QA **merged** · **77** tests  
12. Reports — [SIAMEZ-2.0-RELEASE-REPORT.md](./releases/SIAMEZ-2.0-RELEASE-REPORT.md) · [P7-PERF.md](./releases/P7-PERF.md)  
13. P0–P7 Concierge/wizard track — **merged** on `siamez-2.0`  
14. **Platform marketplace track** — **M0–M7 complete** on `siamez-2.0` (`baeb99e`)  
15. Reports — [PLATFORM-MIGRATION-REPORT.md](./PLATFORM-MIGRATION-REPORT.md) · [PLATFORM-ROADMAP.md](./PLATFORM-ROADMAP.md)  
16. **Platform 2.1** — **Phases 1–9 complete** · [PLATFORM-2.1-AUDIT.md](./PLATFORM-2.1-AUDIT.md) · [guides/](./guides/) · [PLATFORM-2.1-SECURITY.md](./PLATFORM-2.1-SECURITY.md)

Feature branches merge into `siamez-2.0` after Orchestrator review.
