"use client";

import { useState } from "react";
import { saveLicenceRequirementAction } from "@/actions/licence-verification";
import { KNOWN_EVALUATOR_KEYS } from "@/lib/licence-verification/rules-data";

export type RequirementRow = {
  id: string;
  ruleKey: string;
  name: string;
  description: string;
  serviceKinds: string[];
  customerCategories: string[];
  level: "REQUIRED" | "OPTIONAL";
  source: string;
  lastVerifiedOn: string;
  active: boolean;
  evaluatorKey: string;
};

export function LicenceRequirementsEditor({ rules }: { rules: RequirementRow[] }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Driving licence requirements</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">These rules decide the screening. Deactivate a rule when DLT practice changes. A rule with an unknown evaluator is sent to staff instead of being guessed.</p>
      </div>
      {message ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm">{message}</p> : null}
      {rules.map((rule) => (
        <form key={rule.id} className="space-y-2 rounded-2xl border bg-white p-4 text-sm dark:bg-gray-900" onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const result = await saveLicenceRequirementAction({
            id: rule.id,
            ruleKey: rule.ruleKey,
            name: String(data.get("name") ?? ""),
            description: String(data.get("description") ?? ""),
            serviceKinds: String(data.get("serviceKinds") ?? ""),
            customerCategories: String(data.get("customerCategories") ?? ""),
            level: data.get("level") === "OPTIONAL" ? "OPTIONAL" : "REQUIRED",
            source: String(data.get("source") ?? ""),
            lastVerifiedOn: String(data.get("lastVerifiedOn") ?? ""),
            active: data.get("active") === "on",
            evaluatorKey: String(data.get("evaluatorKey") ?? ""),
          });
          setMessage(result.ok ? `Saved ${rule.ruleKey}` : result.error);
        }}>
          <p className="font-semibold">{rule.ruleKey}</p>
          <input className="w-full rounded border px-2 py-1" name="name" defaultValue={rule.name} />
          <textarea className="w-full rounded border px-2 py-1" name="description" rows={2} defaultValue={rule.description} />
          <input className="w-full rounded border px-2 py-1" name="serviceKinds" defaultValue={rule.serviceKinds.join(", ")} />
          <input className="w-full rounded border px-2 py-1" name="customerCategories" defaultValue={rule.customerCategories.join(", ")} />
          <div className="grid gap-2 md:grid-cols-3">
            <select className="rounded border px-2 py-1" name="level" defaultValue={rule.level}>
              <option value="REQUIRED">Required</option>
              <option value="OPTIONAL">Optional</option>
            </select>
            <select className="rounded border px-2 py-1" name="evaluatorKey" defaultValue={rule.evaluatorKey}>
              {KNOWN_EVALUATOR_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
              {KNOWN_EVALUATOR_KEYS.includes(rule.evaluatorKey as (typeof KNOWN_EVALUATOR_KEYS)[number]) ? null : <option value={rule.evaluatorKey}>{rule.evaluatorKey}</option>}
            </select>
            <input className="rounded border px-2 py-1" type="date" name="lastVerifiedOn" defaultValue={rule.lastVerifiedOn} />
          </div>
          <textarea className="w-full rounded border px-2 py-1" name="source" rows={2} defaultValue={rule.source} />
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={rule.active} /> Active</label>
          <button className="rounded bg-siam-blue px-3 py-2 font-semibold text-white" type="submit">Save rule</button>
        </form>
      ))}
    </div>
  );
}
