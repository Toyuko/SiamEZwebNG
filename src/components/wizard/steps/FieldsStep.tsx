"use client";

import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import type { WizardStepConfig } from "@/config/wizards/types";
import { WizardField } from "@/components/wizard/fields/WizardField";

interface FieldsStepProps<T extends FieldValues> {
  step: WizardStepConfig;
  control: Control<T>;
  errors: FieldErrors<T>;
  values: Record<string, unknown>;
  /** Optional content above fields (e.g. compact price guide) */
  header?: React.ReactNode;
  /** Optional guest-login CTA below fields */
  footer?: React.ReactNode;
}

export function FieldsStep<T extends FieldValues>({
  step,
  control,
  errors,
  values,
  header,
  footer,
}: FieldsStepProps<T>) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
          {step.label}
        </h2>
        {step.description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{step.description}</p>
        ) : null}
      </div>
      {header}
      <div className="space-y-5">
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
