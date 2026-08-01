"use client";

import type { Service } from "@prisma/client";
import type { WizardConfig } from "@/config/wizards/types";
import { formatCurrency } from "@/lib/utils";
import type { WizardDocumentMeta } from "./DocumentsStep";

interface ReviewStepProps {
  service: Service;
  config: WizardConfig;
  values: Record<string, unknown>;
  documents: WizardDocumentMeta[];
}

function optionLabel(
  config: WizardConfig,
  fieldName: string,
  value: string
): string {
  for (const step of config.steps) {
    const field = step.fields?.find((f) => f.name === fieldName);
    if (!field?.options) continue;
    const opt = field.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return value;
}

export function ReviewStep({ service, config, values, documents }: ReviewStepProps) {
  const isFixed = service.type === "fixed";
  const priceAmount = service.priceAmount;
  const priceCurrency = service.priceCurrency ?? "THB";

  const fieldEntries: Array<{ label: string; value: string }> = [];
  for (const step of config.steps) {
    if (step.type !== "fields") continue;
    for (const field of step.fields ?? []) {
      const raw = values[field.name];
      if (raw === undefined || raw === null || raw === "") continue;
      if (Array.isArray(raw) && raw.length === 0) continue;
      if (field.type === "checkbox") {
        if (!raw) continue;
        fieldEntries.push({
          label: field.label,
          value: "Yes",
        });
        continue;
      }
      if (field.type === "multiselect" && Array.isArray(raw)) {
        const labels = (raw as string[]).map((v) =>
          optionLabel(config, field.name, v)
        );
        fieldEntries.push({ label: field.label, value: labels.join(", ") });
        continue;
      }
      const str = String(raw);
      fieldEntries.push({
        label: field.label,
        value:
          field.type === "select" ? optionLabel(config, field.name, str) : str,
      });
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Review & submit</h2>

      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-muted">Service</h3>
          <p className="mt-1 font-medium text-foreground">{service.name}</p>
          {isFixed && priceAmount != null ? (
            <p className="mt-1 text-siam-blue">
              {formatCurrency(priceAmount, priceCurrency)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Quote-based — pending review</p>
          )}
        </div>

        {fieldEntries.length > 0 ? (
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-muted">Your answers</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {fieldEntries.map((entry) => (
                <div key={entry.label}>
                  <dt className="text-muted">{entry.label}</dt>
                  <dd className="whitespace-pre-wrap text-foreground">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {documents.length > 0 ? (
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-muted">
              Documents ({documents.length})
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {documents.map((d, i) => (
                <li key={`${d.name}-${i}`}>{d.name}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {!isFixed ? (
        <p className="rounded-lg bg-siam-blue/10 p-4 text-sm text-foreground">
          We will review your request and send you a quote within 24–48 hours at{" "}
          <strong>{String(values.email ?? "")}</strong>.
        </p>
      ) : null}
    </div>
  );
}
