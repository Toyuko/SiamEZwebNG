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
4. Wave 1 — A01 **merged**; A10 (P0 Security) + A12 (QA) in flight  
5. Wave 2 in flight — A02 (Design System)  

Feature branches merge into `siamez-2.0` after Orchestrator review.
