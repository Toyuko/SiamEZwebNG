/**
 * Platform Wave M7 — Universal Workflow templates types.
 * Step targets reuse cuid listing URL contracts (never marketplace slugs).
 */

export type WorkflowListingType = "vehicle" | "property";

export type WorkflowListingFilters = {
  category?: string;
  listingType?: string;
  province?: string;
};

/**
 * Flexible step target stored as JSON on WorkflowTemplateStep.target.
 * Prefer serviceSlug and/or listingFilters; listingId must be a cuid when set.
 */
export type WorkflowStepTarget = {
  serviceSlug?: string;
  listingType?: WorkflowListingType;
  listingFilters?: WorkflowListingFilters;
  /** cuid deep link — never a marketplace slug */
  listingId?: string;
  /** Locale-agnostic path override */
  href?: string;
};

export type WorkflowStepKind = "info" | "action" | "booking" | "approval";
export type WorkflowStepRunStatus =
  | "pending"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "skipped";
export type WorkflowRunStatus = "active" | "completed" | "cancelled" | "rejected";

export type StepTransitionResult =
  | { ok: true; from: WorkflowStepRunStatus; to: WorkflowStepRunStatus }
  | {
      ok: false;
      reason:
        | "invalid_transition"
        | "same_status"
        | "requires_approval"
        | "not_awaiting_approval"
        | "run_not_active";
    };

export type RunTransitionResult =
  | { ok: true; from: WorkflowRunStatus; to: WorkflowRunStatus }
  | { ok: false; reason: "invalid_transition" | "same_status" };

export type WorkflowRunSummary = {
  total: number;
  completed: number;
  awaitingApproval: number;
  rejected: number;
  inProgress: number;
  pending: number;
  /** 0–100 */
  percent: number;
  allDone: boolean;
};

/** Deterministic next-step suggestion (AI stub may polish copy later). */
export type WorkflowNextStep = {
  stepRunId: string;
  templateStepId: string;
  titleEn: string;
  titleTh: string | null;
  status: WorkflowStepRunStatus;
  href: string | null;
  requiresApproval: boolean;
  kind: WorkflowStepKind;
  reason: string;
};
