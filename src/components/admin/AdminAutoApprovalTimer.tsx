"use client";

import { useEffect, useState } from "react";
import { getAutoApprovalRemainingMs } from "@/lib/jobs/auto-approve";
import { Clock } from "lucide-react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AdminAutoApprovalTimer({
  completionSubmittedAt,
  enableAutoApproval,
}: {
  completionSubmittedAt: string | Date;
  enableAutoApproval: boolean;
}) {
  const submitted = new Date(completionSubmittedAt);
  const [remainingMs, setRemainingMs] = useState(() =>
    enableAutoApproval ? getAutoApprovalRemainingMs(submitted) : -1
  );

  useEffect(() => {
    if (!enableAutoApproval) return;
    const tick = () => setRemainingMs(getAutoApprovalRemainingMs(submitted));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [submitted, enableAutoApproval]);

  if (!enableAutoApproval) {
    return <span className="text-xs text-gray-500">Manual review</span>;
  }

  if (remainingMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <Clock className="h-3.5 w-3.5" />
        Auto-approving…
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
      <Clock className="h-3.5 w-3.5" />
      {formatRemaining(remainingMs)}
    </span>
  );
}
