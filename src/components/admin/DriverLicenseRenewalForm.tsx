"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createRenewalAction, updateRenewalAction } from "@/actions/driver-license-renewals";
import { calculateRenewalDates, formatDateOnly } from "@/lib/driver-license-renewal/dates";
import { RENEWAL_TYPE_LABELS } from "@/lib/driver-license-renewal/constants";
import type { DriverLicenseRenewalType } from "@prisma/client";

type Props = {
  mode: "create" | "edit";
  renewalId?: string;
  clientId: string;
  caseId?: string | null;
  defaults?: {
    renewalType?: DriverLicenseRenewalType;
    previousLicenseType?: string | null;
    issueDate?: string;
    expiryDate?: string;
    notes?: string | null;
  };
  onDone?: () => void;
};

export function DriverLicenseRenewalForm({
  mode,
  renewalId,
  clientId,
  caseId,
  defaults,
  onDone,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [renewalType, setRenewalType] = useState<DriverLicenseRenewalType>(
    defaults?.renewalType ?? "DRIVER_LICENSE_2_TO_5"
  );
  const [issueDate, setIssueDate] = useState(defaults?.issueDate ?? "");
  const [expiryDate, setExpiryDate] = useState(defaults?.expiryDate ?? "");
  const [previousLicenseType, setPreviousLicenseType] = useState(
    defaults?.previousLicenseType ?? ""
  );
  const [notes, setNotes] = useState(defaults?.notes ?? "");

  const preview = useMemo(() => {
    if (!issueDate) return null;
    try {
      return calculateRenewalDates({
        issueDate,
        expiryDate: expiryDate || null,
      });
    } catch {
      return null;
    }
  }, [issueDate, expiryDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (mode === "create") {
        const res = await createRenewalAction({
          clientId,
          caseId,
          renewalType,
          previousLicenseType: previousLicenseType || null,
          issueDate,
          expiryDate: expiryDate || null,
          notes: notes || null,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        onDone?.();
        router.refresh();
        if (res.id) router.push(`/admin/driver-license-followups/${res.id}`);
        return;
      }

      if (!renewalId) {
        setError("Missing renewal id");
        return;
      }
      const res = await updateRenewalAction(renewalId, {
        renewalType,
        previousLicenseType: previousLicenseType || null,
        issueDate,
        expiryDate: expiryDate || null,
        notes: notes || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-lg border border-siam-blue/20 bg-siam-blue/5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        Record the <strong>new</strong> license information after renewal (not the old expiry).
        Both 2→5 and 5→5 renewals issue a 5-year license.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">Renewal type</label>
        <Select
          value={renewalType}
          onChange={(e) => setRenewalType(e.target.value as DriverLicenseRenewalType)}
          required
        >
          {(Object.keys(RENEWAL_TYPE_LABELS) as DriverLicenseRenewalType[]).map((key) => (
            <option key={key} value={key}>
              {RENEWAL_TYPE_LABELS[key]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">New license issue date</label>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            New license expiry date{" "}
            <span className="font-normal text-gray-500">(optional — defaults to +5 years)</span>
          </label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Previous license type{" "}
          <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <Input
          value={previousLicenseType}
          onChange={(e) => setPreviousLicenseType(e.target.value)}
          placeholder="e.g. 2-year temporary"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Internal notes</label>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Staff-only notes…"
        />
      </div>

      {preview && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
          <p>
            <span className="text-gray-500">Next renewal:</span>{" "}
            <strong>{formatDateOnly(preview.expiryParts)}</strong>
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Reminder (1 month before):</span>{" "}
            <strong>{formatDateOnly(preview.reminderParts)}</strong>
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !issueDate}>
          {pending ? "Saving…" : mode === "create" ? "Create follow-up" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
