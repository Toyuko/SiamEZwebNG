"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays, ChevronDown, MoreHorizontal, Search } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { WorkStatusBadge } from "@/components/admin/work-center/WorkStatusBadge";
import {
  PAYMENT_TONE_CLASS,
  WORK_CENTER_TABS,
  type WorkCenterTab,
} from "@/lib/admin/work-center";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, formatThb } from "@/lib/jobs/intake";
import type { WorkCenterItem } from "@/data-access/work-center";
import { cn } from "@/lib/utils";

function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function paymentLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  return "Pending";
}

export function WorkCenterClient({
  items,
  total,
  page,
  totalPages,
  tab,
  services,
  staff,
  filters,
}: {
  items: WorkCenterItem[];
  total: number;
  page: number;
  totalPages: number;
  tab: WorkCenterTab;
  services: { id: string; name: string }[];
  staff: { id: string; name: string | null; email: string; role?: string | null }[];
  filters: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [moreOpen, setMoreOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    setSearch(filters.search ?? "");
  }, [filters.search]);

  // Debounced search — avoid querying on every keystroke
  useEffect(() => {
    const current = filters.search ?? "";
    if (search === current) return;
    const handle = window.setTimeout(() => {
      push({ search: search.trim() || undefined, page: "1" });
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push identity is stable enough; we only debounce search
  }, [search]);

  function push(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      ...filters,
      ...next,
      page: next.page ?? filters.page ?? "1",
    };
    for (const [key, value] of Object.entries(merged)) {
      if (!value || value === "all") continue;
      if (key === "tab" && value === "all") continue;
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/admin/work-center?${params.toString()}`);
    });
  }

  return (
    <AdminPageShell
      title="Work Center"
      description="Manage every customer booking, case, and service from one place."
      actions={
        <>
          <Link
            href="/admin/calendar"
            prefetch
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DCE6F5] bg-white px-3 text-sm font-semibold text-siam-ink hover:bg-siam-surface"
          >
            <CalendarDays className="h-4 w-4 text-siam-blue" aria-hidden />
            Calendar
          </Link>
          <Link
            href="/admin/jobs/new"
            prefetch
            className="inline-flex h-10 items-center rounded-xl bg-siam-yellow px-4 text-sm font-bold text-siam-navy shadow-soft"
          >
            + New Job
          </Link>
        </>
      }
    >
      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#DCE6F5] bg-white p-1.5 shadow-soft">
        {WORK_CENTER_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => push({ tab: item.id, page: "1" })}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-premium",
                active
                  ? "bg-siam-blue text-white shadow-soft"
                  : "text-siam-ink-muted hover:bg-siam-surface hover:text-siam-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Primary filters */}
      <div className="rounded-2xl border border-[#DCE6F5] bg-white p-3 shadow-soft sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-siam-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, case ID, email, phone, service..."
              className="h-11 w-full rounded-xl border border-[#DCE6F5] bg-siam-admin-bg/40 pl-10 pr-3 text-sm text-siam-ink outline-none ring-siam-blue focus:ring-2"
              aria-label="Search work"
            />
          </label>

          <select
            value={filters.serviceId ?? "all"}
            onChange={(e) => push({ serviceId: e.target.value, page: "1" })}
            className="h-11 rounded-xl border border-[#DCE6F5] bg-white px-3 text-sm text-siam-ink"
            aria-label="Service"
          >
            <option value="all">All services</option>
            <option value="other">Other</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={filters.staffId ?? "all"}
            onChange={(e) => push({ staffId: e.target.value, page: "1" })}
            className="h-11 rounded-xl border border-[#DCE6F5] bg-white px-3 text-sm text-siam-ink"
            aria-label="Staff"
          >
            <option value="all">All staff</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.role === "freelancer"
                  ? `${person.name || person.email} (freelancer)`
                  : person.name || person.email}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-[#DCE6F5] px-3 text-sm font-semibold text-siam-ink hover:bg-siam-surface"
            aria-expanded={moreOpen}
          >
            More Filters
            <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
          </button>
        </div>

        {moreOpen ? (
          <div className="mt-3 grid gap-2 border-t border-[#DCE6F5] pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-siam-ink-muted">
              Payment
              <select
                value={filters.paymentStatus ?? "all"}
                onChange={(e) => push({ paymentStatus: e.target.value, page: "1" })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DCE6F5] px-3 text-sm text-siam-ink"
              >
                <option value="all">Any payment</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-siam-ink-muted">
              Booking source
              <select
                value={filters.source ?? "all"}
                onChange={(e) => push({ source: e.target.value, page: "1" })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DCE6F5] px-3 text-sm text-siam-ink"
              >
                <option value="all">Any source</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {LEAD_SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-siam-ink-muted">
              From
              <input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(e) => push({ dateFrom: e.target.value || undefined, page: "1" })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DCE6F5] px-3 text-sm text-siam-ink"
              />
            </label>
            <label className="text-xs font-semibold text-siam-ink-muted">
              To
              <input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(e) => push({ dateTo: e.target.value || undefined, page: "1" })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DCE6F5] px-3 text-sm text-siam-ink"
              />
            </label>
          </div>
        ) : null}
      </div>

      <p className={cn("text-sm text-siam-ink-muted", pending && "opacity-60")}>
        {total.toLocaleString()} work item{total === 1 ? "" : "s"}
        {tab === "needs_action" ? " needing attention" : ""}
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-[#DCE6F5] bg-white shadow-soft md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#DCE6F5] text-xs uppercase tracking-wide text-siam-ink-muted">
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-3 py-3 font-semibold">Work ID</th>
              <th className="px-3 py-3 font-semibold">Service</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Payment</th>
              <th className="px-3 py-3 font-semibold">Assigned</th>
              <th className="px-3 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE6F5]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-siam-ink-muted">
                  No work matches these filters.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-siam-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/work-center/${item.id}`}
                      prefetch
                      className="font-semibold text-siam-ink hover:text-siam-blue"
                    >
                      {item.customerName}
                    </Link>
                    <p className="mt-0.5 text-xs text-siam-ink-muted">
                      {[item.customerEmail, item.customerPhone].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {item.primaryAction ? (
                      <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        {item.primaryAction}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-siam-ink">{item.caseNumber}</td>
                  <td className="px-3 py-3 text-siam-ink">{item.serviceName}</td>
                  <td className="px-3 py-3">
                    <WorkStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold",
                        PAYMENT_TONE_CLASS[item.paymentStatus] ?? PAYMENT_TONE_CLASS.unpaid
                      )}
                    >
                      {paymentLabel(item.paymentStatus)}
                    </span>
                    {item.outstandingSatang > 0 ? (
                      <p className="mt-0.5 text-xs text-siam-ink-muted">
                        {formatThb(item.outstandingSatang)} due
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-siam-ink-muted">
                    {item.assignedStaff?.name || item.assignedStaff?.email || "Unassigned"}
                  </td>
                  <td className="px-3 py-3 text-siam-ink-muted">{formatUpdated(item.updatedAt)}</td>
                  <td className="relative px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/work-center/${item.id}`}
                        prefetch
                        className="inline-flex h-9 items-center rounded-lg bg-siam-blue px-3 text-xs font-semibold text-white"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE6F5] text-siam-ink-muted hover:bg-siam-surface"
                        aria-label="More actions"
                        onClick={() =>
                          setOpenMenuId((id) => (id === item.id ? null : item.id))
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    {openMenuId === item.id ? (
                      <div className="absolute right-4 z-20 mt-1 w-48 rounded-xl border border-[#DCE6F5] bg-white py-1 text-left shadow-card">
                        <Link
                          href={`/admin/work-center/${item.id}`}
                          className="block px-3 py-2 text-sm hover:bg-siam-surface"
                        >
                          Open work
                        </Link>
                        <Link
                          href={`/admin/jobs/${item.id}`}
                          className="block px-3 py-2 text-sm hover:bg-siam-surface"
                        >
                          Edit job details
                        </Link>
                        <Link
                          href={`/admin/calendar/new?caseId=${encodeURIComponent(item.id)}`}
                          className="block px-3 py-2 text-sm hover:bg-siam-surface"
                        >
                          Schedule appointment
                        </Link>
                        <Link
                          href={`/admin/invoices/new?caseId=${encodeURIComponent(item.id)}`}
                          className="block px-3 py-2 text-sm hover:bg-siam-surface"
                        >
                          Create invoice
                        </Link>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {items.length === 0 ? (
          <li className="rounded-2xl border border-[#DCE6F5] bg-white p-6 text-center text-sm text-siam-ink-muted shadow-soft">
            No work matches these filters.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[#DCE6F5] bg-white p-4 shadow-soft"
            >
              <Link href={`/admin/work-center/${item.id}`} prefetch className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-siam-ink">{item.customerName}</p>
                    <p className="mt-0.5 text-sm text-siam-ink-muted">{item.serviceName}</p>
                    <p className="mt-0.5 font-mono text-xs text-siam-ink-muted">{item.caseNumber}</p>
                  </div>
                  <WorkStatusBadge status={item.status} />
                </div>
                {item.primaryAction ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">{item.primaryAction}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-siam-ink-muted">
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 font-semibold",
                      PAYMENT_TONE_CLASS[item.paymentStatus]
                    )}
                  >
                    {paymentLabel(item.paymentStatus)}
                  </span>
                  <span>
                    {item.assignedStaff?.name || item.assignedStaff?.email || "Unassigned"}
                  </span>
                  <span>{formatUpdated(item.updatedAt)}</span>
                </div>
              </Link>
              <Link
                href={`/admin/work-center/${item.id}`}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-siam-blue text-sm font-semibold text-white"
              >
                Open
              </Link>
            </li>
          ))
        )}
      </ul>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => push({ page: String(page - 1) })}
            className="h-10 rounded-xl border border-[#DCE6F5] px-4 text-sm font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <p className="text-sm text-siam-ink-muted">
            Page {page} of {totalPages}
          </p>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => push({ page: String(page + 1) })}
            className="h-10 rounded-xl border border-[#DCE6F5] px-4 text-sm font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
