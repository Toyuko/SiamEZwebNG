import type { WizardStageId, WizardStepConfig } from "@/config/wizards/types";

export interface WizardProgressStage {
  id: WizardStageId | string;
  label: string;
  /** First visible step index that belongs to this stage */
  stepIndex: number;
}

const DEFAULT_STAGE_LABELS: Record<WizardStageId, string> = {
  service: "Service",
  quote: "Quote",
  details: "Details",
  confirm: "Confirm",
};

function stageForStep(step: WizardStepConfig): { id: string; label: string } {
  if (step.stage) {
    return {
      id: step.stage,
      label: step.stageLabel ?? DEFAULT_STAGE_LABELS[step.stage] ?? step.label,
    };
  }
  return { id: step.id, label: step.stageLabel ?? step.label };
}

/**
 * Collapse visible wizard steps into customer-facing progress stages.
 * Steps that share a `stage` id appear once in the progress indicator.
 */
export function resolveProgressStages(
  steps: WizardStepConfig[]
): WizardProgressStage[] {
  const stages: WizardProgressStage[] = [];
  const seen = new Set<string>();

  steps.forEach((step, index) => {
    const { id, label } = stageForStep(step);
    if (seen.has(id)) return;
    seen.add(id);
    stages.push({ id, label, stepIndex: index });
  });

  return stages;
}

export function currentStageIndex(
  steps: WizardStepConfig[],
  currentStepIndex: number
): number {
  const stages = resolveProgressStages(steps);
  const step = steps[currentStepIndex];
  if (!step) return 0;
  const { id } = stageForStep(step);
  const idx = stages.findIndex((s) => s.id === id);
  return idx >= 0 ? idx : 0;
}
