import type { WizardCondition } from "@/config/wizards/types";

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

/**
 * Evaluate a basic showWhen condition against current form values.
 */
export function evaluateCondition(
  condition: WizardCondition | undefined,
  values: Record<string, unknown>
): boolean {
  if (!condition) return true;

  if ("and" in condition) {
    return condition.and.every((c) => evaluateCondition(c, values));
  }
  if ("or" in condition) {
    return condition.or.some((c) => evaluateCondition(c, values));
  }

  const raw = values[condition.field];

  if ("equals" in condition) {
    return raw === condition.equals || String(raw) === String(condition.equals);
  }
  if ("notEquals" in condition) {
    return raw !== condition.notEquals && String(raw) !== String(condition.notEquals);
  }
  if ("truthy" in condition) {
    return isPresent(raw);
  }
  if ("falsy" in condition) {
    return !isPresent(raw);
  }

  return true;
}
