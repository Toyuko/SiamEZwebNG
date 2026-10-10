"use client";

import { useActionState } from "react";
import { setReminderDays } from "@/actions/directory";
import type { DirectoryCopy } from "@/lib/directory/copy";

export function ReminderForm({ copy, days }: { copy: DirectoryCopy; days: number }) {
  const [state, action, pending] = useActionState(setReminderDays, null);
  return (
    <form action={action} className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">{copy.reminder}</p>
      <input name="days" type="number" min={7} max={3650} defaultValue={days} className="h-11 w-full rounded-lg border px-3" />
      {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <button disabled={pending} className="h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white">
        {copy.reminderSave}
      </button>
    </form>
  );
}
