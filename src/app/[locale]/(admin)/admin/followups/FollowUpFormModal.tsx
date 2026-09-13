"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCreateFollowUp,
  adminUpdateFollowUp,
  adminApplyFollowUpTemplate,
} from "@/actions/follow-ups";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_TYPE_LABELS,
} from "@/lib/follow-ups/constants";
import type {
  FollowUpPriority,
  FollowUpType,
} from "@prisma/client";
import type {
  ClientOption,
  FollowUpRow,
  ServiceOption,
  StaffOption,
} from "./types";

type TemplateOption = {
  id: string;
  name: string;
  active: boolean;
  serviceId: string | null;
};

const TYPE_OPTIONS = Object.entries(FOLLOW_UP_TYPE_LABELS) as [FollowUpType, string][];
const PRIORITY_OPTIONS = Object.entries(FOLLOW_UP_PRIORITY_LABELS) as [
  FollowUpPriority,
  string,
][];

export function FollowUpFormModal({
  open,
  onClose,
  mode,
  followUp,
  clients,
  services,
  staff,
  templates = [],
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  followUp?: FollowUpRow | null;
  clients: ClientOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  templates?: TemplateOption[];
  defaults?: {
    clientId?: string;
    caseId?: string | null;
    serviceId?: string | null;
    title?: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");

  const initialClientId = followUp?.clientId ?? defaults?.clientId ?? "";
  const initialServiceId = followUp?.serviceId ?? defaults?.serviceId ?? "";
  const lockClient = Boolean(defaults?.clientId && mode === "create");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const clientId = String(fd.get("clientId") ?? "").trim();
    const title = String(fd.get("title") ?? "").trim();
    const dueDate = String(fd.get("dueDate") ?? "").trim();
    if (!clientId || !dueDate) {
      setError("Client and due date are required.");
      return;
    }
    if (!templateId && !title) {
      setError("Title is required.");
      return;
    }

    const payload = {
      clientId,
      caseId: defaults?.caseId || String(fd.get("caseId") || "") || null,
      serviceId: String(fd.get("serviceId") || "") || null,
      title,
      description: String(fd.get("description") || "") || null,
      followUpType: String(fd.get("followUpType") || "CUSTOM") as FollowUpType,
      dueDate,
      dueTime: String(fd.get("dueTime") || "") || null,
      priority: String(fd.get("priority") || "NORMAL") as FollowUpPriority,
      assignedStaffId: String(fd.get("assignedStaffId") || "") || null,
      emailReminderEnabled: fd.get("emailReminderEnabled") === "on",
      emailReminderDate: String(fd.get("emailReminderDate") || "") || null,
      notes: String(fd.get("notes") || "") || null,
    };

    startTransition(async () => {
      try {
        if (mode === "edit" && followUp) {
          await adminUpdateFollowUp(followUp.id, payload);
        } else if (templateId) {
          await adminApplyFollowUpTemplate({
            templateId,
            clientId: payload.clientId,
            caseId: payload.caseId,
            serviceId: payload.serviceId,
            assignedStaffId: payload.assignedStaffId,
            anchorDate: payload.dueDate,
          });
        } else {
          await adminCreateFollowUp(payload);
        }
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save follow-up");
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit follow-up" : "Create follow-up"}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "create" && templates.filter((t) => t.active).length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Apply template (optional)
            </label>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">None — fill manually</option>
              {templates
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </Select>
            {templateId ? (
              <p className="mt-1 text-xs text-gray-500">
                Due date below is used as the template anchor date.
              </p>
            ) : null}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Client</label>
          <Select name="clientId" defaultValue={initialClientId} required disabled={lockClient}>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email}
              </option>
            ))}
          </Select>
          {lockClient ? <input type="hidden" name="clientId" value={initialClientId} /> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
          <Input
            name="title"
            required={!templateId}
            defaultValue={followUp?.title ?? defaults?.title ?? ""}
            disabled={Boolean(templateId)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
          <Textarea
            name="description"
            rows={2}
            defaultValue={followUp?.description ?? ""}
            disabled={Boolean(templateId)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
            <Select
              name="followUpType"
              defaultValue={followUp?.followUpType ?? "CUSTOM"}
              disabled={Boolean(templateId)}
            >
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
            <Select
              name="priority"
              defaultValue={followUp?.priority ?? "NORMAL"}
              disabled={Boolean(templateId)}
            >
              {PRIORITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              {templateId ? "Anchor / due date" : "Due date"}
            </label>
            <Input
              type="date"
              name="dueDate"
              required
              defaultValue={followUp?.dueDate ?? ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Due time</label>
            <Input
              type="time"
              name="dueTime"
              defaultValue={followUp?.dueTime ?? ""}
              disabled={Boolean(templateId)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Service</label>
          <Select
            name="serviceId"
            defaultValue={initialServiceId ?? ""}
            disabled={Boolean(templateId)}
          >
            <option value="">Any / none</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Assigned staff</label>
          <Select
            name="assignedStaffId"
            defaultValue={followUp?.assignedStaffId ?? ""}
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.email}
              </option>
            ))}
          </Select>
        </div>

        {!templateId && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="emailReminderEnabled"
                defaultChecked={followUp?.emailReminderEnabled ?? true}
                className="rounded border-gray-300"
              />
              Email reminder enabled
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Reminder date
              </label>
              <Input
                type="date"
                name="emailReminderDate"
                defaultValue={followUp?.emailReminderDate ?? ""}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
              <Textarea name="notes" rows={2} defaultValue={followUp?.notes ?? ""} />
            </div>
          </>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "edit" ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
