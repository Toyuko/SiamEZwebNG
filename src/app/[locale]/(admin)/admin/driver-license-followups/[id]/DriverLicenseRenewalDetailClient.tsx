"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DriverLicenseStatusBadge } from "@/components/admin/DriverLicenseStatusBadge";
import { DriverLicenseRenewalForm } from "@/components/admin/DriverLicenseRenewalForm";
import {
  sendRenewalReminderAction,
  sendRenewalTestReminderAction,
  setRenewalStatusAction,
  updateRenewalAction,
} from "@/actions/driver-license-renewals";
import { formatDisplayDate } from "@/lib/driver-license-renewal/dates";
import { RENEWAL_TYPE_LABELS } from "@/lib/driver-license-renewal/constants";
import type {
  DriverLicenseActivityType,
  DriverLicenseFollowUpStatus,
  DriverLicenseReminderSendMethod,
  DriverLicenseRenewalType,
} from "@prisma/client";

type Detail = {
  id: string;
  renewalType: DriverLicenseRenewalType;
  previousLicenseType: string | null;
  issueDate: Date | string;
  expiryDate: Date | string;
  nextRenewalDate: Date | string;
  reminderDate: Date | string;
  reminderSentAt: Date | string | null;
  reminderSendMethod: DriverLicenseReminderSendMethod | null;
  status: DriverLicenseFollowUpStatus;
  notes: string | null;
  client: { id: string; name: string | null; email: string; phone: string | null };
  case: {
    id: string;
    caseNumber: string;
    service: { slug: string; name: string };
  } | null;
  assignedStaff: { id: string; name: string | null; email: string } | null;
  reminderSentBy: { id: string; name: string | null; email: string } | null;
  activities: Array<{
    id: string;
    type: DriverLicenseActivityType;
    fromStatus: DriverLicenseFollowUpStatus | null;
    toStatus: DriverLicenseFollowUpStatus | null;
    sendMethod: DriverLicenseReminderSendMethod | null;
    note: string | null;
    createdAt: Date | string;
    actor: { id: string; name: string | null; email: string } | null;
  }>;
};

function fmt(d: Date | string) {
  return formatDisplayDate(typeof d === "string" ? d : d);
}

function toInputDate(d: Date | string) {
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 10);
}

export function DriverLicenseRenewalDetailClient({ renewal }: { renewal: Detail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rescheduleReminder, setRescheduleReminder] = useState(toInputDate(renewal.reminderDate));
  const [rescheduleRenewal, setRescheduleRenewal] = useState(toInputDate(renewal.nextRenewalDate));
  const [noteDraft, setNoteDraft] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Action failed");
        return;
      }
      setMessage(success);
      router.refresh();
    });
  };

  const confirmStatus = (status: DriverLicenseFollowUpStatus, label: string) => {
    if (!window.confirm(`Mark this follow-up as "${label}"?`)) return;
    run(
      () => setRenewalStatusAction(renewal.id, status, noteDraft || null),
      `Marked as ${label}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/driver-license-followups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {renewal.client.name ?? renewal.client.email}
          </h1>
          <p className="text-sm text-gray-500">
            {RENEWAL_TYPE_LABELS[renewal.renewalType]} ·{" "}
            <DriverLicenseStatusBadge status={renewal.status} />
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/clients/${renewal.client.id}/edit`}>Client profile</Link>
        </Button>
      </div>

      {message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>License details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel edit" : "Edit renewal"}
            </Button>
          </CardHeader>
          <CardContent>
            {editing ? (
              <DriverLicenseRenewalForm
                mode="edit"
                renewalId={renewal.id}
                clientId={renewal.client.id}
                caseId={renewal.case?.id}
                defaults={{
                  renewalType: renewal.renewalType,
                  previousLicenseType: renewal.previousLicenseType,
                  issueDate: toInputDate(renewal.issueDate),
                  expiryDate: toInputDate(renewal.expiryDate),
                  notes: renewal.notes,
                }}
                onDone={() => setEditing(false)}
              />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-gray-500">Customer</dt>
                  <dd className="font-medium">{renewal.client.name ?? "—"}</dd>
                  <dd className="text-gray-600">{renewal.client.email}</dd>
                  <dd className="text-gray-600">{renewal.client.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Case</dt>
                  <dd>
                    {renewal.case ? (
                      <Link
                        href={`/admin/cases/${renewal.case.id}`}
                        className="text-siam-blue hover:underline"
                      >
                        {renewal.case.caseNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Issue date</dt>
                  <dd>{fmt(renewal.issueDate)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Expiry / next renewal</dt>
                  <dd>{fmt(renewal.nextRenewalDate)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Reminder date</dt>
                  <dd>{fmt(renewal.reminderDate)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Reminder status</dt>
                  <dd>
                    {renewal.reminderSentAt
                      ? `Sent ${fmt(renewal.reminderSentAt)} (${renewal.reminderSendMethod ?? "—"})`
                      : "Not sent"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Assigned staff</dt>
                  <dd>{renewal.assignedStaff?.name ?? renewal.assignedStaff?.email ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Internal notes</dt>
                  <dd className="whitespace-pre-wrap">{renewal.notes || "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              disabled={pending || Boolean(renewal.reminderSentAt)}
              onClick={() => {
                if (!window.confirm("Send the production renewal reminder email now?")) return;
                run(() => sendRenewalReminderAction(renewal.id), "Reminder sent");
              }}
            >
              {renewal.reminderSentAt ? "Reminder already sent" : "Send reminder"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() =>
                run(() => sendRenewalTestReminderAction(renewal.id), "Test reminder sent")
              }
            >
              Send test reminder
            </Button>

            <div className="border-t pt-3 space-y-2">
              <label className="block text-xs font-medium text-gray-500">Action note (optional)</label>
              <Input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Optional note for activity log"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => confirmStatus("CONTACTED", "Contacted")}
              >
                Mark contacted
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => confirmStatus("RENEWED", "Renewed")}
              >
                Mark renewed
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => confirmStatus("NOT_INTERESTED", "Not interested")}
              >
                Not interested
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600"
                disabled={pending}
                onClick={() => confirmStatus("CANCELLED", "Cancelled")}
              >
                Cancel follow-up
              </Button>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">Reschedule</p>
              <label className="block text-xs text-gray-500">Next renewal</label>
              <Input
                type="date"
                value={rescheduleRenewal}
                onChange={(e) => setRescheduleRenewal(e.target.value)}
              />
              <label className="block text-xs text-gray-500">Reminder date</label>
              <Input
                type="date"
                value={rescheduleReminder}
                onChange={(e) => setRescheduleReminder(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      updateRenewalAction(renewal.id, {
                        nextRenewalDate: rescheduleRenewal,
                        reminderDate: rescheduleReminder,
                      }),
                    "Follow-up rescheduled"
                  )
                }
              >
                Save schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {renewal.activities.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {renewal.activities.map((a) => (
                <li key={a.id} className="border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{a.type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(a.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {a.actor?.name ?? a.actor?.email ?? "System"}
                    {a.sendMethod ? ` · ${a.sendMethod}` : ""}
                    {a.fromStatus && a.toStatus ? ` · ${a.fromStatus} → ${a.toStatus}` : ""}
                  </p>
                  {a.note && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{a.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
