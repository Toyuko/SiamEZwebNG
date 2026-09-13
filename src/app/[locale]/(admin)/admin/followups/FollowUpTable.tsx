"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Check,
  X,
  Clock,
  UserPlus,
  Mail,
  Pencil,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  adminCompleteFollowUp,
  adminCancelFollowUp,
  adminSnoozeFollowUp,
  adminAssignFollowUp,
  adminSendFollowUpReminder,
} from "@/actions/follow-ups";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_TYPE_LABELS,
  PRIORITY_BADGE_CLASS,
  SNOOZE_PRESETS,
  STATUS_BADGE_CLASS,
} from "@/lib/follow-ups/constants";
import { formatDisplayDate } from "@/lib/follow-ups/dates";
import type { FollowUpRow, StaffOption } from "./types";

const OPEN = new Set(["PENDING", "DUE", "IN_PROGRESS", "SNOOZED"]);

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function FollowUpTable({
  items,
  total,
  page,
  totalPages,
  staff,
  onEdit,
}: {
  items: FollowUpRow[];
  total: number;
  page: number;
  totalPages: number;
  staff: StaffOption[];
  onEdit: (row: FollowUpRow) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setMenuId(null);
        setSnoozeId(null);
        setAssignId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  };

  const handleComplete = (id: string) => {
    if (!confirm("Mark this follow-up as completed?")) return;
    run(() => adminCompleteFollowUp(id));
  };

  const handleCancel = (id: string) => {
    if (!confirm("Cancel this follow-up?")) return;
    run(() => adminCancelFollowUp(id));
  };

  const handleReminder = (id: string) => {
    if (!confirm("Send email reminder to the client now?")) return;
    run(async () => {
      const result = await adminSendFollowUpReminder(id);
      if (!result.ok) {
        throw new Error(
          "skipped" in result && result.skipped
            ? `Reminder skipped: ${result.reason}`
            : `Reminder failed: ${result.reason}`
        );
      }
    });
  };

  const handleSnooze = (id: string, days?: number, untilDate?: string) => {
    run(() => adminSnoozeFollowUp({ id, days, untilDate }));
  };

  const handleAssign = (id: string) => {
    run(() => adminAssignFollowUp(id, assignStaffId || null));
  };

  if (items.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-gray-500">
        No follow-ups match these filters.
      </p>
    );
  }

  return (
    <div>
      {error ? (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Assigned staff</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reminder</th>
              <th className="px-4 py-3 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const open = OPEN.has(row.status);
              return (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${row.clientId}`}
                      className="font-medium text-siam-blue hover:underline"
                    >
                      {row.client.name ?? "—"}
                    </Link>
                    <div className="text-xs text-gray-500">{row.client.email}</div>
                    {row.client.phone ? (
                      <div className="text-xs text-gray-500">{row.client.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.service?.name ?? "—"}
                    {row.case ? (
                      <div className="text-xs">
                        <Link
                          href={`/admin/cases/${row.case.id}`}
                          className="text-siam-blue hover:underline"
                        >
                          {row.case.caseNumber}
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {row.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {FOLLOW_UP_TYPE_LABELS[row.followUpType]}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDisplayDate(row.dueDate)}
                    {row.dueTime ? (
                      <div className="text-xs text-gray-500">{row.dueTime}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.assignedStaff?.name ?? row.assignedStaff?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PRIORITY_BADGE_CLASS[row.priority]}>
                      {FOLLOW_UP_PRIORITY_LABELS[row.priority]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_BADGE_CLASS[row.status]}>
                      {FOLLOW_UP_STATUS_LABELS[row.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {row.reminderStatus}
                    {row.emailReminderDate ? (
                      <div>{formatDisplayDate(row.emailReminderDate)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" asChild title="View">
                        <Link href={`/admin/followups/${row.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {open ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Complete"
                            disabled={pending}
                            onClick={() => handleComplete(row.id)}
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="More"
                            onClick={() =>
                              setMenuId(menuId === row.id ? null : row.id)
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {menuId === row.id ? (
                        <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => onEdit(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              setSnoozeId(row.id);
                              setMenuId(null);
                            }}
                          >
                            <Clock className="h-3.5 w-3.5" /> Snooze
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              setAssignId(row.id);
                              setAssignStaffId(row.assignedStaffId ?? "");
                              setMenuId(null);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Reassign
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            disabled={pending}
                            onClick={() => handleReminder(row.id)}
                          >
                            <Mail className="h-3.5 w-3.5" /> Send reminder
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            disabled={pending}
                            onClick={() => handleCancel(row.id)}
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(page - 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(page + 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(snoozeId)}
        onClose={() => setSnoozeId(null)}
        title="Snooze follow-up"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SNOOZE_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => snoozeId && handleSnooze(snoozeId, p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Custom date
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
              <Button
                type="button"
                disabled={pending || !customDate || !snoozeId}
                onClick={() => snoozeId && handleSnooze(snoozeId, undefined, customDate)}
              >
                Snooze
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(assignId)}
        onClose={() => setAssignId(null)}
        title="Reassign follow-up"
      >
        <div className="space-y-3">
          <Select
            value={assignStaffId}
            onChange={(e) => setAssignStaffId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.email}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignId(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !assignId}
              onClick={() => assignId && handleAssign(assignId)}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
