"use client";

import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import type { WizardStepConfig } from "@/config/wizards/types";
import { WizardField } from "@/components/wizard/fields/WizardField";

interface FieldsStepProps<T extends FieldValues> {
  step: WizardStepConfig;
  control: Control<T>;
  errors: FieldErrors<T>;
  values: Record<string, unknown>;
  /** Optional guest-login CTA below fields */
  footer?: React.ReactNode;
}

export function FieldsStep<T extends FieldValues>({
  step,
  control,
  errors,
  values,
  footer,
}: FieldsStepProps<T>) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{step.label}</h2>
        {step.description ? (
          <p className="mt-1 text-sm text-muted">{step.description}</p>
        ) : null}
      </div>
      <div className="space-y-4">
        {(step.fields ?? []).map((field) => (
          <WizardField
            key={field.name}
            field={field}
            control={control}
            errors={errors}
            values={values}
          />
        ))}
      </div>
      {footer}
    </div>
  );
}
