"use client";

import { useActionState } from "react";
import { submitCorrection, submitNewOffice, submitReport } from "@/actions/directory";
import type { DirectoryActionState } from "@/actions/directory";
import type { DirectoryCopy } from "@/lib/directory/copy";
import { REPORT_FIELDS, CORRECTION_FIELDS } from "@/lib/directory/constants";
import { THAI_PROVINCES } from "@/lib/directory/provinces";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:bg-slate-950";

function Notice({ state }: { state: DirectoryActionState }) {
  if (!state) return null;
  return (
    <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"} role="status">
      {state.message || Object.values(state.fieldErrors ?? {})[0]}
    </p>
  );
}

export function ReportForm({ copy, officeId }: { copy: DirectoryCopy; officeId: string }) {
  const [state, action, pending] = useActionState(submitReport, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-border p-4">
      <h2 className="font-semibold">{copy.report}</h2>
      <input type="hidden" name="officeId" value={officeId} />
      <label className="block text-sm">
        {copy.status}
        <select name="field" className={fieldClass} defaultValue="phone">
          {REPORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {copy.reportFields[field]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {copy.explanation}
        <textarea name="explanation" required minLength={8} rows={4} className={fieldClass} />
      </label>
      <Notice state={state} />
      <button disabled={pending} className="min-h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white">
        {copy.sendReport}
      </button>
    </form>
  );
}

export function CorrectionForm({ copy, officeId }: { copy: DirectoryCopy; officeId: string }) {
  const [state, action, pending] = useActionState(submitCorrection, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-border p-4">
      <h2 className="font-semibold">{copy.correct}</h2>
      <p className="text-sm text-muted-foreground">{copy.suggestLead}</p>
      <input type="hidden" name="officeId" value={officeId} />
      <label className="block text-sm">
        {copy.status}
        <select name="field" className={fieldClass} defaultValue="phonePrimary">
          {CORRECTION_FIELDS.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {copy.suggestedValue}
        <textarea name="suggestedValue" required rows={3} className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.notes}
        <textarea name="explanation" rows={2} className={fieldClass} />
      </label>
      <Notice state={state} />
      <button disabled={pending} className="min-h-11 rounded-xl border border-siam-blue px-4 text-sm font-semibold text-siam-blue">
        {copy.sendCorrection}
      </button>
    </form>
  );
}

export function SuggestOfficeForm({
  copy,
  categories,
}: {
  copy: DirectoryCopy;
  categories: Array<{ slug: string; nameEn: string; nameTh: string }>;
}) {
  const [state, action, pending] = useActionState(submitNewOffice, null);
  return (
    <form action={action} className="mx-auto max-w-xl space-y-3">
      <p className="text-sm text-muted-foreground">{copy.suggestLead}</p>
      <label className="block text-sm">
        {copy.nameEn}
        <input name="nameEn" className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.nameTh}
        <input name="nameTh" className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.category}
        <select name="categorySlug" required className={fieldClass}>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.nameEn} / {category.nameTh}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {copy.province}
        <select name="provinceCode" required className={fieldClass} defaultValue="10">
          {THAI_PROVINCES.map((province) => (
            <option key={province.code} value={province.code}>
              {province.nameEn} — {province.nameTh}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {copy.district}
        <input name="district" className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.contact}
        <input name="phonePrimary" className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.address} EN
        <textarea name="addressEn" rows={2} className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.address} TH
        <textarea name="addressTh" rows={2} className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.website}
        <input name="website" className={fieldClass} />
      </label>
      <label className="block text-sm">
        {copy.notes}
        <textarea name="notes" rows={3} className={fieldClass} />
      </label>
      <Notice state={state} />
      <button disabled={pending} className="min-h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white">
        {copy.submitSuggestion}
      </button>
    </form>
  );
}
