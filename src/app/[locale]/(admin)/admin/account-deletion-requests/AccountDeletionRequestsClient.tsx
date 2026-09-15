"use client";

import { useState, useTransition } from "react";
import { processAccountDeletionRequest } from "@/actions/account-deletion";
import { Button } from "@/components/ui/button";

type RequestRow = {
  id: string;
  email: string;
  userId: string | null;
  status: string;
  source: string;
  locale: string | null;
  adminNotes: string | null;
  requestedAt: string;
  processingAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  processedBy: { name: string | null; email: string } | null;
  auditLogs: { id: string; action: string; createdAt: string }[];
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function AccountDeletionRequestsClient({ requests }: { requests: RequestRow[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const filtered =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  function runAction(requestId: string, action: "process" | "reject", notes: string) {
    setMessage(null);
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("action", action);
    fd.set("notes", notes);
    startTransition(async () => {
      const r = await processAccountDeletionRequest(fd);
      if (r && "error" in r) {
        setMessage(r.error ?? "Error");
      } else {
        setMessage(action === "process" ? "Processed." : "Rejected.");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Account Deletion Requests
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Review and process Google Play / privacy account deletion requests. Processing permanently
          deletes or anonymizes personal data for the matched user.
        </p>
      </div>

      {message && (
        <p className="rounded-md border border-siam-blue/30 bg-siam-blue/5 px-3 py-2 text-sm">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {["ALL", "PENDING", "PROCESSING", "COMPLETED", "REJECTED"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              filter === s
                ? "bg-siam-blue text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40">
            <tr>
              <th className="px-3 py-2">Request</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Processed</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  No requests.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800 align-top">
                <td className="px-3 py-3 font-mono text-xs">
                  <div>{r.id.slice(0, 12)}…</div>
                  {r.auditLogs[0] && (
                    <div className="mt-1 text-[11px] text-gray-500">
                      Last: {r.auditLogs[0].action}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div>{r.email}</div>
                  {r.userId && (
                    <div className="text-[11px] text-gray-500">user: {r.userId.slice(0, 10)}…</div>
                  )}
                  {r.adminNotes && (
                    <div className="mt-1 max-w-xs text-xs text-amber-700 dark:text-amber-300">
                      {r.adminNotes}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-800">
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs">{r.source}</td>
                <td className="px-3 py-3 text-xs whitespace-nowrap">{formatDate(r.requestedAt)}</td>
                <td className="px-3 py-3 text-xs whitespace-nowrap">
                  {formatDate(r.completedAt || r.rejectedAt || r.processingAt)}
                  {r.processedBy && (
                    <div className="text-[11px] text-gray-500">
                      by {r.processedBy.name || r.processedBy.email}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {(r.status === "PENDING" || r.status === "PROCESSING") && (
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (
                            confirm(
                              `Permanently delete/anonymize data for ${r.email}? This cannot be undone.`
                            )
                          ) {
                            runAction(r.id, "process", "");
                          }
                        }}
                      >
                        Process deletion
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          const notes = window.prompt("Rejection notes (optional)") ?? "";
                          runAction(r.id, "reject", notes);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
