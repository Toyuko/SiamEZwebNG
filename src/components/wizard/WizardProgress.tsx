"use client";

import { Stepper } from "@/components/ui/stepper";
import type { WizardStepConfig } from "@/config/wizards/types";

interface WizardProgressProps {
  steps: WizardStepConfig[];
  currentIndex: number;
}

export function WizardProgress({ steps, currentIndex }: WizardProgressProps) {
  return (
    <Stepper
      steps={steps.map((s) => ({ id: s.id, label: s.label }))}
      currentIndex={currentIndex}
    />
  );
}
