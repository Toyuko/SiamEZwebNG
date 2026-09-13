"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  adminCompleteFollowUp,
  adminCancelFollowUp,
  adminSnoozeFollowUp,
  adminAssignFollowUp,
  adminAddFollowUpNote,
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
import type {
  FollowUpActivityType,
  FollowUpPriority,
  FollowUpReminderStatus,
  FollowUpStatus,
  FollowUpType,
} from "@prisma/client";
import { FollowUpFormModal } from "../FollowUpFormModal";
import type { ClientOption, ServiceOption, StaffOption } from "../types";

type DetailFollowUp = {
  id: string;
  title: string;
  description: string | null;
  followUpType: FollowUpType;
  dueDate: string;
  dueTime: string | null;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  emailReminderEnabled: boolean;
  emailReminderDate: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  reminderSentAt: string | null;
  reminderStatus: FollowUpReminderStatus;
  notes: string | null;
  completedAt: string | null;
  clientId: string;
  caseId: string | null;
  serviceId: string | null;
  assignedStaffId: string | null;
  client: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  service: { id: string; name: string; slug: string } | null;
  case: { id: string; caseNumber: string } | null;
  assignedStaff: { id: string; name: string | null; email: string } | null;
  completedBy: { id: string; name: string | null; email: string } | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  template: { id: string; name: string } | null;
  activities: Array<{
    id: string;
    type: FollowUpActivityType;
    note: string | null;
    fromStatus: FollowUpStatus | null;
    toStatus: FollowUpStatus | null;
    createdAt: string;
    actor: { id: string; name: string | null; email: string } | null;
  }>;
};

const OPEN = new Set(["PENDING", "DUE", "IN_PROGRESS", "SNOOZED"]);

export function FollowUpDetailClient({
  followUp,
  staff,
  services,
  clients,
}: {
  followUp: DetailFollowUp;
  staff: StaffOption[];
  services: ServiceOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [note, setNote] = useState("");
  const [assignStaffId, setAssignStaffId] = useState(
    followUp.assignedStaffId ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const open = OPEN.has(followUp.status);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/followups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {followUp.title}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[followUp.status]}`}
            >
              {FOLLOW_UP_STATUS_LABELS[followUp.status]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASS[followUp.priority]}`}
            >
              {FOLLOW_UP_PRIORITY_LABELS[followUp.priority]}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {FOLLOW_UP_TYPE_LABELS[followUp.followUpType]} · Due{" "}
            {formatDisplayDate(followUp.dueDate)}
            {followUp.dueTime ? ` ${followUp.dueTime}` : ""}
          </p>
        </div>
        {open ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Mark completed?")) {
                  run(() => adminCompleteFollowUp(followUp.id));
                }
              }}
            >
              Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSnoozeOpen(true)}
            >
              Snooze
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Send email reminder now?")) {
                  run(async () => {
                    const result = await adminSendFollowUpReminder(followUp.id);
                    if (!result.ok) {
                      throw new Error(result.reason);
                    }
                  });
                }
              }}
            >
              Send reminder
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Cancel this follow-up?")) {
                  run(() => adminCancelFollowUp(followUp.id));
                }
              }}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {followUp.description ? <p>{followUp.description}</p> : null}
              {followUp.notes ? (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Notes:</span> {followUp.notes}
                </p>
              ) : null}
              {followUp.template ? (
                <p className="text-gray-500">Template: {followUp.template.name}</p>
              ) : null}
              {followUp.completedAt ? (
                <p className="text-gray-500">
                  Completed {new Date(followUp.completedAt).toLocaleString()}
                  {followUp.completedBy
                    ? ` by ${followUp.completedBy.name ?? followUp.completedBy.email}`
                    : ""}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {followUp.activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {followUp.activities.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-800"
                    >
                      <div className="font-medium">{a.type.replaceAll("_", " ")}</div>
                      {a.note ? <p className="mt-1 text-gray-600">{a.note}</p> : null}
                      <p className="mt-1 text-xs text-gray-500">
                        {a.actor?.name ?? a.actor?.email ?? "System"} ·{" "}
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link
                href={`/admin/clients/${followUp.clientId}`}
                className="font-medium text-siam-blue hover:underline"
              >
                {followUp.client.name ?? followUp.client.email}
              </Link>
              <p>{followUp.client.email}</p>
              <p className="text-gray-500">{followUp.client.phone ?? "—"}</p>
              {followUp.case ? (
                <p>
                  Case:{" "}
                  <Link
                    href={`/admin/cases/${followUp.case.id}`}
                    className="text-siam-blue hover:underline"
                  >
                    {followUp.case.caseNumber}
                  </Link>
                </p>
              ) : null}
              <p className="text-gray-500">
                Service: {followUp.service?.name ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reminder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Enabled: {followUp.emailReminderEnabled ? "Yes" : "No"}
              </p>
              <p>Status: {followUp.reminderStatus}</p>
              <p>
                Date:{" "}
                {followUp.emailReminderDate
                  ? formatDisplayDate(followUp.emailReminderDate)
                  : "—"}
              </p>
              {followUp.reminderSentAt ? (
                <p>
                  Sent: {new Date(followUp.reminderSentAt).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {open ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Reassign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
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
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        adminAssignFollowUp(followUp.id, assignStaffId || null)
                      )
                    }
                  >
                    Save assignee
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Internal note…"
                  />
                  <Button
                    size="sm"
                    disabled={pending || !note.trim()}
                    onClick={() => {
                      const value = note.trim();
                      if (!value) return;
                      run(async () => {
                        await adminAddFollowUpNote(followUp.id, value);
                        setNote("");
                      });
                    }}
                  >
                    Add note
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <FollowUpFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        followUp={{
          ...followUp,
          client: followUp.client,
          service: followUp.service,
          case: followUp.case,
          assignedStaff: followUp.assignedStaff,
        }}
        clients={clients}
        services={services}
        staff={staff}
      />

      <Modal open={snoozeOpen} onClose={() => setSnoozeOpen(false)} title="Snooze">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SNOOZE_PRESETS.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  run(async () => {
                    await adminSnoozeFollowUp({ id: followUp.id, days: p.days });
                    setSnoozeOpen(false);
                  });
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <Button
              disabled={pending || !customDate}
              onClick={() => {
                run(async () => {
                  await adminSnoozeFollowUp({
                    id: followUp.id,
                    untilDate: customDate,
                  });
                  setSnoozeOpen(false);
                });
              }}
            >
              Snooze
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
