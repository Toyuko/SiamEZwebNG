import { z } from "zod";
import type { WizardFieldConfig, WizardStepConfig } from "@/config/wizards/types";
import { evaluateCondition } from "./conditionals";

function fieldSchema(field: WizardFieldConfig): z.ZodTypeAny {
  switch (field.type) {
    case "email": {
      if (field.required) {
        return z
          .string()
          .min(1, `${field.label} is required`)
          .email("Please enter a valid email");
      }
      return z
        .string()
        .email("Please enter a valid email")
        .or(z.literal(""));
    }
    case "checkbox":
      return field.required
        ? z.literal(true, {
            errorMap: () => ({ message: `${field.label} is required` }),
          })
        : z.boolean().optional().default(false);
    case "number": {
      const base = z.coerce.number({
        invalid_type_error: `${field.label} must be a number`,
      });
      return field.required ? base : base.optional();
    }
    case "select":
    case "text":
    case "textarea":
    case "phone":
    case "tel":
    case "date":
    default: {
      let s = z.string();
      if (field.required) {
        s = s.min(1, `${field.label} is required`);
      }
      if (field.minLength != null) {
        s = s.min(field.minLength, `${field.label} is too short`);
      }
      if (field.maxLength != null) {
        s = s.max(field.maxLength, `${field.label} is too long`);
      }
      if (field.required) return s;
      return s.optional().or(z.literal(""));
    }
  }
}

/**
 * Build a Zod object schema for visible fields on a step.
 * Fields hidden by showWhen are omitted (not validated).
 */
export function buildStepSchema(
  step: WizardStepConfig,
  values: Record<string, unknown>
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of step.fields ?? []) {
    if (!evaluateCondition(field.showWhen, values)) continue;
    shape[field.name] = fieldSchema(field);
  }
  return z.object(shape);
}

/** Validate only the current step's visible fields. */
export function validateStep(
  step: WizardStepConfig,
  values: Record<string, unknown>
): { success: true; data: Record<string, unknown> } | { success: false; fieldErrors: Record<string, string> } {
  if (step.type !== "fields" || !step.fields?.length) {
    return { success: true, data: {} };
  }
  const schema = buildStepSchema(step, values);
  const pick: Record<string, unknown> = {};
  for (const name of Object.keys(schema.shape)) {
    pick[name] = values[name];
  }
  const result = schema.safeParse(pick);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(result.error.flatten().fieldErrors)) {
      if (v?.[0]) fieldErrors[k] = v[0];
    }
    return { success: false, fieldErrors };
  }
  return { success: true, data: result.data as Record<string, unknown> };
}
