"use client";

import { useState, useTransition } from "react";
import { setFeatureFlagAction } from "@/actions/feature-flags";

export function FeatureFlagToggle({ flagKey, initialEnabled }: { flagKey: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  return <button type="button" role="switch" aria-checked={enabled} disabled={pending} className={`rounded px-3 py-1 text-sm font-medium ${enabled ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100"}`} onClick={() => startTransition(async () => { const next = !enabled; const result = await setFeatureFlagAction({ key: flagKey, enabled: next }); if (result.ok) setEnabled(next); })}>{enabled ? "Enabled" : "Disabled"}</button>;
}
