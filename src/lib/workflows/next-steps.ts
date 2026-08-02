/**
 * Deterministic next-steps for a workflow run.
 * AI stub: polishNextStepCopy may rewrite reason text when OPENAI is available later;
 * this module always returns structured suggestions without an API key.
 */

import { resolveStepTargetHref, parseStepTarget } from "./target";
import { findActiveStepIndex } from "./transitions";
import type {
  WorkflowNextStep,
  WorkflowRunStatus,
  WorkflowStepKind,
  WorkflowStepRunStatus,
  WorkflowStepTarget,
} from "./types";

export type NextStepInput = {
  stepRunId: string;
  templateStepId: string;
  titleEn: string;
  titleTh: string | null;
  status: WorkflowStepRunStatus;
  kind: WorkflowStepKind;
  requiresApproval: boolean;
  target: unknown;
  sortOrder: number;
};

function reasonForStatus(
  status: WorkflowStepRunStatus,
  requiresApproval: boolean,
  kind: WorkflowStepKind
): string {
  switch (status) {
    case "pending":
      return kind === "booking"
        ? "Start this booking step when you are ready."
        : "This step is next in your workflow.";
    case "in_progress":
      return requiresApproval
        ? "Finish the action, then submit for staff approval."
        : "Complete this step to continue.";
    case "awaiting_approval":
      return "Waiting for staff approval before the workflow can continue.";
    case "approved":
      return "Staff approved — mark this step complete to continue.";
    case "rejected":
      return "Staff rejected this step — revise and resubmit.";
    case "completed":
      return "Step complete.";
    case "skipped":
      return "Step skipped.";
    default:
      return "Continue the workflow.";
  }
}

/**
 * Optional AI polish stub — returns input unchanged (deterministic fallback).
 * Wire an LLM later without changing call sites.
 */
export async function polishNextStepCopy(
  steps: WorkflowNextStep[]
): Promise<WorkflowNextStep[]> {
  return steps;
}

/**
 * Compute ordered next-step suggestions for UI timelines.
 * Prefer the active (first non-terminal) step; also surface awaiting_approval.
 */
export function computeNextSteps(
  steps: NextStepInput[],
  options?: { runStatus?: WorkflowRunStatus; preferBook?: boolean }
): WorkflowNextStep[] {
  if (options?.runStatus && options.runStatus !== "active") {
    return [];
  }

  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const statuses = sorted.map((s) => s.status);
  const activeIdx = findActiveStepIndex(statuses);

  const out: WorkflowNextStep[] = [];
  const push = (s: NextStepInput) => {
    const target: WorkflowStepTarget = parseStepTarget(s.target);
    const preferBook = options?.preferBook ?? s.kind === "booking";
    out.push({
      stepRunId: s.stepRunId,
      templateStepId: s.templateStepId,
      titleEn: s.titleEn,
      titleTh: s.titleTh,
      status: s.status,
      href: resolveStepTargetHref(target, { preferBook }),
      requiresApproval: s.requiresApproval,
      kind: s.kind,
      reason: reasonForStatus(s.status, s.requiresApproval, s.kind),
    });
  };

  if (activeIdx >= 0) {
    push(sorted[activeIdx]!);
  }

  for (const s of sorted) {
    if (s.status === "awaiting_approval" && !out.some((o) => o.stepRunId === s.stepRunId)) {
      push(s);
    }
  }

  return out;
}
