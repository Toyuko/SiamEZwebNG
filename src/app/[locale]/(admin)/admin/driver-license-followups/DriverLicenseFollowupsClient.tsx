"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DriverLicenseStatusBadge } from "@/components/admin/DriverLicenseStatusBadge";
import { formatDisplayDate } from "@/lib/driver-license-renewal/dates";
import {
  FOLLOW_UP_STATUS_LABELS,
  RENEWAL_TYPE_LABELS,
} from "@/lib/driver-license-renewal/constants";
import type { DriverLicenseFollowUpStatus, DriverLicenseRenewalType } from "@prisma/client";

type RenewalRow = {
  id: string;
  renewalType: DriverLicenseRenewalType;
  issueDate: Date | string;
  expiryDate: Date | string;
  nextRenewalDate: Date | string;
  reminderDate: Date | string;
  reminderSentAt: Date | string | null;
  status: DriverLicenseFollowUpStatus;
  client: { id: string; name: string | null; email: string; phone: string | null };
  case: { id: string; caseNumber: string } | null;
  assignedStaff: { id: string; name: string | null; email: string } | null;
};

type Stats = {
  renewalsNext30: number;
  renewalsNext90: number;
  remindersDue: number;
  remindersSent: number;
  contacted: number;
  renewed: number;
  overdue: number;
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "due_soon", label: "Due soon" },
  { value: "REMINDER_DUE", label: "Reminder due" },
  { value: "REMINDER_SENT", label: "Reminder sent" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "RENEWED", label: "Renewed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "UPCOMING", label: "Upcoming" },
];

function fmt(d: Date | string) {
  return formatDisplayDate(typeof d === "string" ? d : d);
}

export function DriverLicenseFollowupsClient({
  renewals,
  stats,
  total,
  page,
  totalPages,
  initial,
}: {
  renewals: RenewalRow[];
  stats: Stats;
  total: number;
  page: number;
  totalPages: number;
  initial: {
    status?: string;
    range?: string;
    search?: string;
    sort?: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initial.search ?? "");
  const [status, setStatus] = useState(initial.status ?? "all");
  const [range, setRange] = useState(initial.range ?? "");
  const [sort, setSort] = useState(initial.sort ?? "renewal");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  const apply = (overrides?: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = {
      status,
      range,
      search,
      sort,
      from,
      to,
      ...overrides,
    };
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.range) params.set("range", next.range);
    if (next.search?.trim()) params.set("search", next.search.trim());
    if (next.sort && next.sort !== "renewal") params.set("sort", next.sort);
    if (next.range === "custom" && next.from) params.set("from", next.from);
    if (next.range === "custom" && next.to) params.set("to", next.to);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const statCards = useMemo(
    () => [
      { label: "Next 30 days", value: stats.renewalsNext30, href: "?range=30d&status=due_soon" },
      { label: "Next 90 days", value: stats.renewalsNext90, href: "?range=90d" },
      { label: "Reminders due", value: stats.remindersDue, href: "?status=REMINDER_DUE" },
      { label: "Reminders sent", value: stats.remindersSent, href: "?status=REMINDER_SENT" },
      { label: "Contacted", value: stats.contacted, href: "?status=CONTACTED" },
      { label: "Renewed", value: stats.renewed, href: "?status=RENEWED" },
      { label: "Overdue", value: stats.overdue, href: "?status=due_soon&sort=renewal" },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Driver&apos;s License Follow-Ups
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Track license renewals and one-month reminder emails ({total} records).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => (
          <Link key={card.label} href={`/admin/driver-license-followups${card.href}`}>
            <Card className="transition hover:border-siam-blue/40 hover:shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs font-medium text-gray-500">Date range</label>
            <Select
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                if (e.target.value !== "custom") {
                  setFrom("");
                  setTo("");
                }
              }}
            >
              <option value="">Any</option>
              <option value="7d">Next 7 days</option>
              <option value="30d">Next 30 days</option>
              <option value="90d">Next 90 days</option>
              <option value="6m">Next 6 months</option>
              <option value="custom">Custom range</option>
            </Select>
          </div>
          {range === "custom" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs font-medium text-gray-500">Sort</label>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="renewal">Renewal date</option>
              <option value="reminder">Reminder date</option>
              <option value="customer">Customer</option>
              <option value="status">Status</option>
            </Select>
          </div>
          <Button type="button" onClick={() => apply()} disabled={pending}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {renewals.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No driver&apos;s license follow-ups match these filters.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Expiry / renewal</th>
                  <th className="px-4 py-3">Reminder</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {renewals.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {r.client.name ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500">{r.client.email}</div>
                      <div className="text-xs text-gray-500">{r.client.phone ?? "—"}</div>
                      {r.case && (
                        <div className="text-xs text-siam-blue">{r.case.caseNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{RENEWAL_TYPE_LABELS[r.renewalType]}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(r.issueDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(r.nextRenewalDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{fmt(r.reminderDate)}</div>
                      <div className="text-xs text-gray-500">
                        {r.reminderSentAt ? "Sent" : "Pending"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DriverLicenseStatusBadge status={r.status} />
                      <span className="sr-only">{FOLLOW_UP_STATUS_LABELS[r.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.assignedStaff?.name ?? r.assignedStaff?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/driver-license-followups/${r.id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || pending}
              onClick={() => apply({ page: String(page - 1) } as never)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || pending}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(page + 1));
                startTransition(() => router.push(`${pathname}?${params.toString()}`));
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
