"use client";

import type { Control, FieldErrors, FieldValues, Path } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
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

function resolveSelectPresentation(
  field: WizardFieldConfig
): "cards" | "native" | "segmented" {
  if (field.presentation) return field.presentation;
  const count = field.options?.length ?? 0;
  if (count > 0 && count <= 6) return "cards";
  return "native";
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
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm transition-colors",
                rhf.value
                  ? "border-siam-blue bg-siam-blue/5 text-siam-ink"
                  : "border-[#DCE6F5] bg-white text-siam-ink hover:border-siam-blue/40"
              )}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={Boolean(rhf.value)}
                onChange={(e) => rhf.onChange(e.target.checked)}
                onBlur={rhf.onBlur}
                ref={rhf.ref}
                className="mt-1 h-4 w-4 rounded border-[#DCE6F5] text-siam-blue focus:ring-siam-blue"
              />
              <span>
                <span className="font-medium">{field.label}</span>
                {field.description ? (
                  <span className="mt-0.5 block text-xs text-[#64748B]">
                    {field.description}
                  </span>
                ) : null}
              </span>
            </label>
          )}
        />
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
                  const isOn = selected.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      htmlFor={optId}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm transition-colors",
                        isOn
                          ? "border-siam-blue bg-siam-blue/5 ring-1 ring-siam-blue/30"
                          : "border-[#DCE6F5] bg-white hover:border-siam-blue/40"
                      )}
                    >
                      <input
                        id={optId}
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggle(opt.value)}
                        onBlur={rhf.onBlur}
                        className="mt-1 h-4 w-4 rounded border-[#DCE6F5] text-siam-blue focus:ring-siam-blue"
                      />
                      <span>
                        <span className="font-medium text-siam-ink">{opt.label}</span>
                        {opt.description ? (
                          <span className="mt-0.5 block text-xs text-[#64748B]">
                            {opt.description}
                          </span>
                        ) : null}
                      </span>
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
            return <Textarea {...common} rows={3} />;
          }

          if (field.type === "select") {
            const presentation = resolveSelectPresentation(field);
            const options = field.options ?? [];

            if (presentation === "segmented") {
              return (
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`,
                  }}
                  role="radiogroup"
                  aria-labelledby={`${inputId}-label`}
                >
                  <span id={`${inputId}-label`} className="sr-only">
                    {field.label}
                  </span>
                  {options.map((opt) => {
                    const selected = rhf.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => rhf.onChange(opt.value)}
                        onBlur={rhf.onBlur}
                        className={cn(
                          "min-h-12 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue",
                          selected
                            ? "border-siam-blue bg-siam-blue text-white"
                            : "border-[#DCE6F5] bg-white text-siam-ink hover:border-siam-blue/50"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              );
            }

            if (presentation === "cards") {
              return (
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-labelledby={`${inputId}-label`}
                >
                  <span id={`${inputId}-label`} className="sr-only">
                    {field.label}
                  </span>
                  {options.map((opt) => {
                    const selected = rhf.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => rhf.onChange(opt.value)}
                        onBlur={rhf.onBlur}
                        className={cn(
                          "relative flex min-h-[4.5rem] flex-col items-start rounded-2xl border px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue",
                          selected
                            ? "border-siam-blue bg-siam-blue/5 shadow-sm ring-1 ring-siam-blue/25"
                            : "border-[#DCE6F5] bg-white hover:border-siam-blue/40"
                        )}
                      >
                        {selected ? (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-siam-blue text-white">
                            <Check className="h-3 w-3" aria-hidden />
                          </span>
                        ) : null}
                        <span className="pr-6 text-sm font-semibold text-siam-ink">
                          {opt.label}
                        </span>
                        {opt.description ? (
                          <span className="mt-1 text-xs leading-snug text-[#64748B]">
                            {opt.description}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <Select {...common}>
                <option value="">{field.placeholder ?? "Select…"}</option>
                {options.map((opt) => (
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
              autoComplete={
                field.type === "email"
                  ? "email"
                  : field.type === "phone" || field.type === "tel"
                    ? "tel"
                    : field.name === "name"
                      ? "name"
                      : undefined
              }
              inputMode={
                field.type === "phone" || field.type === "tel" ? "tel" : undefined
              }
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
      {field.description && field.type !== "checkbox" ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : null}
      <FieldError error={errorMessage} />
    </Field>
  );
}
