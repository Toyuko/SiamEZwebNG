"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_TYPE_LABELS,
} from "@/lib/follow-ups/constants";
import type { FollowUpFiltersState, ServiceOption, StaffOption } from "./types";

const REMINDER_OPTIONS = [
  { value: "all", label: "All reminders" },
  { value: "NONE", label: "None" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Skipped" },
];

export function FollowUpFilters({
  initial,
  services,
  staff,
}: {
  initial: FollowUpFiltersState;
  services: ServiceOption[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initial.search ?? "");
  const [serviceId, setServiceId] = useState(initial.serviceId ?? "");
  const [followUpType, setFollowUpType] = useState(initial.followUpType ?? "all");
  const [status, setStatus] = useState(initial.status ?? "all");
  const [priority, setPriority] = useState(initial.priority ?? "all");
  const [assignedStaffId, setAssignedStaffId] = useState(
    initial.assignedStaffId ?? "all"
  );
  const [reminderStatus, setReminderStatus] = useState(
    initial.reminderStatus ?? "all"
  );
  const [dueFrom, setDueFrom] = useState(initial.dueFrom ?? "");
  const [dueTo, setDueTo] = useState(initial.dueTo ?? "");

  const apply = (overrides?: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = {
      search,
      serviceId,
      followUpType,
      status,
      priority,
      assignedStaffId,
      reminderStatus,
      dueFrom,
      dueTo,
      bucket: initial.bucket,
      view: initial.view,
      ...overrides,
    };
    if (next.search?.trim()) params.set("search", next.search.trim());
    if (next.serviceId) params.set("serviceId", next.serviceId);
    if (next.followUpType && next.followUpType !== "all") {
      params.set("type", next.followUpType);
    }
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.priority && next.priority !== "all") {
      params.set("priority", next.priority);
    }
    if (next.assignedStaffId && next.assignedStaffId !== "all") {
      params.set("assignedStaff", next.assignedStaffId);
    }
    if (next.reminderStatus && next.reminderStatus !== "all") {
      params.set("reminder", next.reminderStatus);
    }
    if (next.dueFrom) params.set("dueFrom", next.dueFrom);
    if (next.dueTo) params.set("dueTo", next.dueTo);
    if (next.bucket && next.bucket !== "all") params.set("bucket", next.bucket);
    if (next.view) params.set("view", next.view);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clear = () => {
    setSearch("");
    setServiceId("");
    setFollowUpType("all");
    setStatus("all");
    setPriority("all");
    setAssignedStaffId("all");
    setReminderStatus("all");
    setDueFrom("");
    setDueTo("");
    startTransition(() => {
      const params = new URLSearchParams();
      if (initial.view) params.set("view", initial.view);
      router.push(params.toString() ? `${pathname}?${params}` : pathname);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone, case #"
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-gray-500">Service</label>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
          <Select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
            <option value="all">All types</option>
            {Object.entries(FOLLOW_UP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(FOLLOW_UP_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-36">
          <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(FOLLOW_UP_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-gray-500">Staff</label>
          <Select
            value={assignedStaffId}
            onChange={(e) => setAssignedStaffId(e.target.value)}
          >
            <option value="all">All staff</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">Reminder</label>
          <Select
            value={reminderStatus}
            onChange={(e) => setReminderStatus(e.target.value)}
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Due from</label>
          <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Due to</label>
          <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => apply()} disabled={pending}>
            Apply
          </Button>
          <Button type="button" variant="outline" onClick={clear} disabled={pending}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
