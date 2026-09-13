"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Plus, LayoutList, CalendarDays, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FollowUpFilters } from "./FollowUpFilters";
import { FollowUpTable } from "./FollowUpTable";
import { FollowUpFormModal } from "./FollowUpFormModal";
import { FollowUpCalendar } from "./FollowUpCalendar";
import type {
  ClientOption,
  FollowUpFiltersState,
  FollowUpRow,
  FollowUpStats,
  ServiceOption,
  StaffOption,
} from "./types";

type TemplateOption = {
  id: string;
  name: string;
  active: boolean;
  serviceId: string | null;
};

type CalendarItem = {
  id: string;
  title: string;
  dueDate: string;
  status: FollowUpRow["status"];
  priority: FollowUpRow["priority"];
  client: { id: string; name: string | null; email: string };
  service: { id: string; name: string; slug: string } | null;
};

const STAT_CARDS: Array<{
  key: keyof FollowUpStats;
  label: string;
  bucket: string;
}> = [
  { key: "dueToday", label: "Due today", bucket: "due_today" },
  { key: "overdue", label: "Overdue", bucket: "overdue" },
  { key: "dueWeek", label: "Due this week", bucket: "due_week" },
  { key: "dueMonth", label: "Due this month", bucket: "due_month" },
  { key: "highPriority", label: "High priority", bucket: "high_priority" },
  { key: "assignedToMe", label: "Assigned to me", bucket: "assigned_to_me" },
  { key: "completed", label: "Completed", bucket: "completed" },
  { key: "upcoming", label: "Upcoming", bucket: "upcoming" },
];

function hrefForBucket(bucket: string, view?: string) {
  const params = new URLSearchParams();
  params.set("bucket", bucket);
  if (view) params.set("view", view);
  return `/admin/followups?${params.toString()}`;
}

export function FollowUpsDashboard({
  stats,
  items,
  total,
  page,
  totalPages,
  filters,
  services,
  staff,
  clients,
  templates,
  calendarItems,
  calendarYear,
  calendarMonth,
}: {
  stats: FollowUpStats;
  items: FollowUpRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: FollowUpFiltersState;
  services: ServiceOption[];
  staff: StaffOption[];
  clients: ClientOption[];
  templates: TemplateOption[];
  calendarItems: CalendarItem[];
  calendarYear: number;
  calendarMonth: number;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<FollowUpRow | null>(null);
  const view = filters.view === "calendar" ? "calendar" : "list";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Follow-ups
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track client follow-ups across services ({total} matching).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/followups/templates">
              <Settings2 className="h-4 w-4" />
              Templates
            </Link>
          </Button>
          <Button
            onClick={() => {
              setEditRow(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New follow-up
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {STAT_CARDS.map((card) => (
          <Link key={card.key} href={hrefForBucket(card.bucket, filters.view)}>
            <Card
              className={`transition hover:border-siam-blue/40 hover:shadow-sm ${
                filters.bucket === card.bucket ? "border-siam-blue" : ""
              }`}
            >
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats[card.key]}
                </p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant={view === "list" ? "default" : "outline"} size="sm" asChild>
          <Link
            href={
              filters.bucket
                ? `/admin/followups?bucket=${filters.bucket}`
                : "/admin/followups"
            }
          >
            <LayoutList className="h-4 w-4" />
            List
          </Link>
        </Button>
        <Button
          variant={view === "calendar" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link
            href={
              filters.bucket
                ? `/admin/followups?view=calendar&bucket=${filters.bucket}`
                : "/admin/followups?view=calendar"
            }
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Link>
        </Button>
      </div>

      {view === "list" ? (
        <>
          <FollowUpFilters
            initial={filters}
            services={services}
            staff={staff}
          />
          <Card>
            <CardContent className="p-0">
              <FollowUpTable
                items={items}
                total={total}
                page={page}
                totalPages={totalPages}
                staff={staff}
                onEdit={(row) => {
                  setEditRow(row);
                  setFormOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <FollowUpCalendar
          initialItems={calendarItems}
          initialYear={calendarYear}
          initialMonth={calendarMonth}
        />
      )}

      <FollowUpFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRow(null);
        }}
        mode={editRow ? "edit" : "create"}
        followUp={editRow}
        clients={clients}
        services={services}
        staff={staff}
        templates={templates}
      />
    </div>
  );
}
