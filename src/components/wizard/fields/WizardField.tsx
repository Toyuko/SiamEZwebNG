"use client";

import type { Control, FieldErrors, FieldValues, Path } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import type { WizardFieldConfig } from "@/config/wizards/types";
import { evaluateCondition } from "@/components/wizard/lib/conditionals";
import {
  getMinimumAppointmentDateString,
  isWeekendYmd,
  toNearestWeekdayYmd,
} from "@/lib/driver-license-booking";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface WizardFieldProps<T extends FieldValues> {
  field: WizardFieldConfig;
  control: Control<T>;
  errors: FieldErrors<T>;
  values: Record<string, unknown>;
}

export function WizardField<T extends FieldValues>({
  field,
  control,
  errors,
  values,
}: WizardFieldProps<T>) {
  const watched = useWatch({ control });
  const merged = { ...values, ...(watched as Record<string, unknown>) };

  if (!evaluateCondition(field.showWhen, merged)) {
    return null;
  }

  const name = field.name as Path<T>;
  const errorMessage = (errors[field.name] as { message?: string } | undefined)?.message;
  const inputId = `wizard-field-${field.name}`;

  if (field.type === "checkbox") {
    return (
      <Field>
        <Controller
          name={name}
          control={control}
          render={({ field: rhf }) => (
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-start gap-3 text-sm text-foreground"
            >
              <input
                id={inputId}
                type="checkbox"
                checked={Boolean(rhf.value)}
                onChange={(e) => rhf.onChange(e.target.checked)}
                onBlur={rhf.onBlur}
                ref={rhf.ref}
                className="mt-1 h-4 w-4 rounded border-border text-siam-blue focus:ring-siam-blue"
              />
              <span>
                {field.label}
                {field.required ? (
                  <span className="ml-0.5 text-destructive" aria-hidden>
                    *
                  </span>
                ) : null}
              </span>
            </label>
          )}
        />
        {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
        <FieldError error={errorMessage} />
      </Field>
    );
  }

  if (field.type === "multiselect") {
    const options = field.options ?? [];
    return (
      <Field>
        <FieldLabel required={field.required}>{field.label}</FieldLabel>
        {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
        <Controller
          name={name}
          control={control}
          render={({ field: rhf }) => {
            const selected = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];
            const toggle = (value: string) => {
              const next = selected.includes(value)
                ? selected.filter((v) => v !== value)
                : [...selected, value];
              rhf.onChange(next);
            };
            return (
              <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby={inputId}>
                <span id={inputId} className="sr-only">
                  {field.label}
                </span>
                {options.map((opt) => {
                  const optId = `${inputId}-${opt.value}`;
                  return (
                    <label
                      key={opt.value}
                      htmlFor={optId}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm"
                    >
                      <input
                        id={optId}
                        type="checkbox"
                        checked={selected.includes(opt.value)}
                        onChange={() => toggle(opt.value)}
                        onBlur={rhf.onBlur}
                        className="h-4 w-4 rounded border-border text-siam-blue focus:ring-siam-blue"
                      />
                      <span className="font-medium text-foreground">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            );
          }}
        />
        <FieldError error={errorMessage} />
      </Field>
    );
  }

  const dateMin =
    field.type === "date"
      ? field.customValidate === "driverLicenseAppointment"
        ? getMinimumAppointmentDateString()
        : field.min
      : undefined;

  return (
    <Field>
      <FieldLabel htmlFor={inputId} required={field.required}>
        {field.label}
      </FieldLabel>
      <Controller
        name={name}
        control={control}
        render={({ field: rhf }) => {
          const common = {
            id: inputId,
            value: (rhf.value as string) ?? "",
            onChange: rhf.onChange,
            onBlur: rhf.onBlur,
            ref: rhf.ref,
            name: rhf.name,
            placeholder: field.placeholder,
            "aria-invalid": !!errorMessage,
            className: cn(errorMessage && "border-destructive focus-visible:ring-destructive"),
          };

          if (field.type === "textarea") {
            return <Textarea {...common} rows={4} />;
          }
          if (field.type === "select") {
            return (
              <Select {...common}>
                <option value="">{field.placeholder ?? "Select…"}</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            );
          }

          const inputType =
            field.type === "email"
              ? "email"
              : field.type === "phone" || field.type === "tel"
                ? "tel"
                : field.type === "date"
                  ? "date"
                  : field.type === "number"
                    ? "number"
                    : "text";

          return (
            <Input
              {...common}
              type={inputType}
              min={dateMin}
              onChange={(e) => {
                const raw = e.target.value;
                if (
                  field.type === "date" &&
                  field.customValidate === "driverLicenseAppointment" &&
                  raw &&
                  isWeekendYmd(raw)
                ) {
                  rhf.onChange(toNearestWeekdayYmd(raw) ?? "");
                  return;
                }
                rhf.onChange(raw);
              }}
            />
          );
        }}
      />
      {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
      <FieldError error={errorMessage} />
    </Field>
  );
}
