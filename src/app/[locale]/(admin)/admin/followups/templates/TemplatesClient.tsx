"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  adminCreateFollowUpTemplate,
  adminUpdateFollowUpTemplate,
  adminDeleteFollowUpTemplate,
} from "@/actions/follow-ups";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_TYPE_LABELS,
} from "@/lib/follow-ups/constants";
import type {
  FollowUpPriority,
  FollowUpTemplateTrigger,
  FollowUpType,
  RelativeDateDirection,
  RelativeDateUnit,
} from "@prisma/client";
import type { ServiceOption, StaffOption } from "../types";

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  serviceId: string | null;
  serviceSlug: string | null;
  followUpType: FollowUpType;
  priority: FollowUpPriority;
  delayValue: number;
  delayUnit: RelativeDateUnit;
  delayDirection: RelativeDateDirection;
  triggerEvent: FollowUpTemplateTrigger;
  reminderEnabled: boolean;
  reminderOffsetValue: number;
  reminderOffsetUnit: RelativeDateUnit;
  reminderOffsetDirection: RelativeDateDirection;
  emailEnabled: boolean;
  emailSubject: string | null;
  emailBody: string | null;
  defaultAssigneeId: string | null;
  autoApply: boolean;
  active: boolean;
  service: { id: string; name: string; slug: string } | null;
  defaultAssignee: { id: string; name: string | null; email: string } | null;
};

const TRIGGERS: FollowUpTemplateTrigger[] = [
  "MANUAL",
  "CASE_COMPLETED",
  "QUOTE_SENT",
  "SERVICE_COMPLETED",
  "CUSTOM_DATE",
  "EXPIRY_DATE",
];

const UNITS: RelativeDateUnit[] = ["DAYS", "WEEKS", "MONTHS"];
const DIRECTIONS: RelativeDateDirection[] = ["BEFORE", "AFTER"];

export function TemplatesClient({
  templates,
  services,
  staff,
}: {
  templates: TemplateRow[];
  services: ServiceOption[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TemplateRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    const payload = {
      name,
      description: String(fd.get("description") || "") || null,
      serviceId: String(fd.get("serviceId") || "") || null,
      serviceSlug: String(fd.get("serviceSlug") || "") || null,
      followUpType: String(fd.get("followUpType") || "CUSTOM") as FollowUpType,
      priority: String(fd.get("priority") || "NORMAL") as FollowUpPriority,
      delayValue: Number(fd.get("delayValue") || 7),
      delayUnit: String(fd.get("delayUnit") || "DAYS") as RelativeDateUnit,
      delayDirection: String(
        fd.get("delayDirection") || "AFTER"
      ) as RelativeDateDirection,
      triggerEvent: String(
        fd.get("triggerEvent") || "MANUAL"
      ) as FollowUpTemplateTrigger,
      reminderEnabled: fd.get("reminderEnabled") === "on",
      reminderOffsetValue: Number(fd.get("reminderOffsetValue") || 0),
      reminderOffsetUnit: String(
        fd.get("reminderOffsetUnit") || "DAYS"
      ) as RelativeDateUnit,
      reminderOffsetDirection: String(
        fd.get("reminderOffsetDirection") || "BEFORE"
      ) as RelativeDateDirection,
      emailEnabled: fd.get("emailEnabled") === "on",
      emailSubject: String(fd.get("emailSubject") || "") || null,
      emailBody: String(fd.get("emailBody") || "") || null,
      defaultAssigneeId: String(fd.get("defaultAssigneeId") || "") || null,
      autoApply: fd.get("autoApply") === "on",
      active: fd.get("active") === "on",
    };

    startTransition(async () => {
      try {
        if (edit) {
          await adminUpdateFollowUpTemplate(edit.id, payload);
        } else {
          await adminCreateFollowUpTemplate(payload);
        }
        setOpen(false);
        setEdit(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save template");
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Follow-up templates
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reusable follow-up schedules for services and case completion.
          </p>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {templates.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No templates yet. Create one to speed up follow-up creation.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Due offset</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.name}</div>
                      {t.description ? (
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {t.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {t.service?.name ?? t.serviceSlug ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {FOLLOW_UP_TYPE_LABELS[t.followUpType]} ·{" "}
                      {FOLLOW_UP_PRIORITY_LABELS[t.priority]}
                    </td>
                    <td className="px-4 py-3">
                      {t.delayValue} {t.delayUnit.toLowerCase()}{" "}
                      {t.delayDirection.toLowerCase()}
                    </td>
                    <td className="px-4 py-3">{t.triggerEvent}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEdit(t);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Delete template "${t.name}"?`)) return;
                            startTransition(async () => {
                              await adminDeleteFollowUpTemplate(t.id);
                              router.refresh();
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEdit(null);
          setError(null);
        }}
        title={edit ? "Edit template" : "New template"}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
            <Input name="name" required defaultValue={edit?.name ?? ""} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Description
            </label>
            <Textarea
              name="description"
              rows={2}
              defaultValue={edit?.description ?? ""}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Service
              </label>
              <Select name="serviceId" defaultValue={edit?.serviceId ?? ""}>
                <option value="">Any</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Service slug
              </label>
              <Input
                name="serviceSlug"
                defaultValue={edit?.serviceSlug ?? ""}
                placeholder="optional"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
              <Select
                name="followUpType"
                defaultValue={edit?.followUpType ?? "CUSTOM"}
              >
                {Object.entries(FOLLOW_UP_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Priority
              </label>
              <Select name="priority" defaultValue={edit?.priority ?? "NORMAL"}>
                {Object.entries(FOLLOW_UP_PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Delay
              </label>
              <Input
                type="number"
                min={0}
                name="delayValue"
                defaultValue={edit?.delayValue ?? 7}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Unit
              </label>
              <Select name="delayUnit" defaultValue={edit?.delayUnit ?? "DAYS"}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Direction
              </label>
              <Select
                name="delayDirection"
                defaultValue={edit?.delayDirection ?? "AFTER"}
              >
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Trigger
            </label>
            <Select
              name="triggerEvent"
              defaultValue={edit?.triggerEvent ?? "MANUAL"}
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Default assignee
            </label>
            <Select
              name="defaultAssigneeId"
              defaultValue={edit?.defaultAssigneeId ?? ""}
            >
              <option value="">None</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Reminder offset
              </label>
              <Input
                type="number"
                min={0}
                name="reminderOffsetValue"
                defaultValue={edit?.reminderOffsetValue ?? 0}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Unit
              </label>
              <Select
                name="reminderOffsetUnit"
                defaultValue={edit?.reminderOffsetUnit ?? "DAYS"}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Direction
              </label>
              <Select
                name="reminderOffsetDirection"
                defaultValue={edit?.reminderOffsetDirection ?? "BEFORE"}
              >
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Email subject
            </label>
            <Input name="emailSubject" defaultValue={edit?.emailSubject ?? ""} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Email body
            </label>
            <Textarea
              name="emailBody"
              rows={3}
              defaultValue={edit?.emailBody ?? ""}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="reminderEnabled"
                defaultChecked={edit?.reminderEnabled ?? true}
              />
              Reminder enabled
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="emailEnabled"
                defaultChecked={edit?.emailEnabled ?? true}
              />
              Email enabled
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="autoApply"
                defaultChecked={edit?.autoApply ?? false}
              />
              Auto-apply
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={edit?.active ?? true}
              />
              Active
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
