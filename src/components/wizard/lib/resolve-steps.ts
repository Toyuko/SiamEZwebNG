import type { WizardConfig, WizardStepConfig } from "@/config/wizards/types";
import { evaluateCondition } from "./conditionals";

/** Steps visible given current form values (step-level showWhen). */
export function resolveVisibleSteps(
  config: WizardConfig,
  values: Record<string, unknown>
): WizardStepConfig[] {
  return config.steps.filter((step) => evaluateCondition(step.showWhen, values));
}
