"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_TYPE_LABELS,
  PRIORITY_BADGE_CLASS,
  STATUS_BADGE_CLASS,
} from "@/lib/follow-ups/constants";
import { formatDisplayDate } from "@/lib/follow-ups/dates";
import { FollowUpFormModal } from "@/app/[locale]/(admin)/admin/followups/FollowUpFormModal";
import type {
  ClientOption,
  FollowUpRow,
  ServiceOption,
  StaffOption,
} from "@/app/[locale]/(admin)/admin/followups/types";

type Grouped = {
  upcoming: FollowUpRow[];
  overdue: FollowUpRow[];
  completed: FollowUpRow[];
  cancelled: FollowUpRow[];
};

type TemplateOption = {
  id: string;
  name: string;
  active: boolean;
  serviceId: string | null;
};

function FollowUpList({
  title,
  items,
  empty,
}: {
  title: string;
  items: FollowUpRow[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/followups/${f.id}`}
                    className="font-medium text-siam-blue hover:underline"
                  >
                    {f.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {FOLLOW_UP_TYPE_LABELS[f.followUpType]} · Due{" "}
                    {formatDisplayDate(f.dueDate)}
                    {f.service ? ` · ${f.service.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[f.status]}`}
                  >
                    {FOLLOW_UP_STATUS_LABELS[f.status]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASS[f.priority]}`}
                  >
                    {FOLLOW_UP_PRIORITY_LABELS[f.priority]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientFollowUpsSection({
  clientId,
  client,
  groups,
  services,
  staff,
  templates,
}: {
  clientId: string;
  client: ClientOption;
  groups: Grouped;
  services: ServiceOption[];
  staff: StaffOption[];
  templates: TemplateOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Follow-ups
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Create follow-up
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FollowUpList
          title="Overdue"
          items={groups.overdue}
          empty="No overdue follow-ups."
        />
        <FollowUpList
          title="Upcoming"
          items={groups.upcoming}
          empty="No upcoming follow-ups."
        />
        <FollowUpList
          title="Completed"
          items={groups.completed}
          empty="No completed follow-ups."
        />
        <FollowUpList
          title="Cancelled"
          items={groups.cancelled}
          empty="No cancelled follow-ups."
        />
      </div>

      <FollowUpFormModal
        open={open}
        onClose={() => setOpen(false)}
        mode="create"
        clients={[client]}
        services={services}
        staff={staff}
        templates={templates}
        defaults={{ clientId }}
      />
    </div>
  );
}
