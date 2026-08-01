import { z } from "zod";
import type { WizardFieldConfig, WizardStepConfig } from "@/config/wizards/types";
import {
  getMinimumAppointmentDateString,
  isValidDriverLicenseAppointmentDate,
} from "@/lib/driver-license-booking";
import { evaluateCondition } from "./conditionals";

function applyCustomValidate(
  field: WizardFieldConfig,
  schema: z.ZodTypeAny
): z.ZodTypeAny {
  if (field.customValidate === "driverLicenseAppointment") {
    return schema.superRefine((val, ctx) => {
      const dateStr = typeof val === "string" ? val : "";
      const minYmd = getMinimumAppointmentDateString();
      const result = isValidDriverLicenseAppointmentDate(dateStr, minYmd);
      if (result === "ok") return;
      const message =
        result === "required"
          ? `${field.label} is required`
          : result === "weekend"
            ? "Please choose a weekday (Monday–Friday)"
            : "Please choose a date at least 3 days ahead (weekdays only)";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    });
  }
  return schema;
}

function fieldSchema(field: WizardFieldConfig): z.ZodTypeAny {
  switch (field.type) {
    case "email": {
      const base = field.required
        ? z
            .string()
            .min(1, `${field.label} is required`)
            .email("Please enter a valid email")
        : z.string().email("Please enter a valid email").or(z.literal(""));
      return applyCustomValidate(field, base);
    }
    case "checkbox":
      return field.required
        ? z.literal(true, {
            errorMap: () => ({ message: `${field.label} is required` }),
          })
        : z.boolean().optional().default(false);
    case "multiselect": {
      const base = z.array(z.string());
      if (field.required) {
        return base.min(1, `Select at least one ${field.label.toLowerCase()}`);
      }
      return base.optional().default([]);
    }
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
      const withOptional = field.required ? s : s.optional().or(z.literal(""));
      return applyCustomValidate(field, withOptional);
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
    // Custom refine issues land in formErrors when not field-bound; map to first field
    if (Object.keys(fieldErrors).length === 0 && result.error.issues.length > 0) {
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
    }
    return { success: false, fieldErrors };
  }
  return { success: true, data: result.data as Record<string, unknown> };
}
