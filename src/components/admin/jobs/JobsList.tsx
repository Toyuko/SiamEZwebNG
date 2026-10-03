"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { CASE_STATUS_LABELS } from "@/lib/domain/case-status";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, formatThb, formatBangkokDate, formatBangkokTime } from "@/lib/jobs/intake";
import type { CaseStatus } from "@prisma/client";

export type JobCard = {
  id: string;
  caseNumber: string;
  customerName: string;
  jobType: string;
  scheduledAt: string | null;
  scheduleTimeTbd: boolean;
  assignedStaff: { name: string | null; email: string } | null;
  closedBy: { name: string | null; email: string } | null;
  totalSatang: number;
  paidSatang: number;
  outstandingSatang: number;
  status: CaseStatus;
  paymentStatus: string;
};

export function JobsList({
  jobs,
  total,
  page,
  totalPages,
  services,
  staff,
  filters,
}: {
  jobs: JobCard[];
  total: number;
  page: number;
  totalPages: number;
  services: { id: string; name: string }[];
  staff: { id: string; name: string | null; email: string }[];
  filters: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search ?? "");

  function push(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next, page: next.page ?? "1" };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "all") params.set(key, value);
    }
    router.push(`/admin/jobs?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs</h1>
          <p className="text-sm text-gray-500">{total} jobs</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-siam-yellow px-4 font-semibold text-siam-blue-dark"
        >
          + New Job
        </Link>
      </div>

      <form
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          push({ search });
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, email, phone, invoice, job ID"
          className="min-h-11 rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900 sm:col-span-2"
        />
        <Select
          label="When"
          value={filters.window ?? "all"}
          onChange={(window) => push({ window })}
          options={[
            ["all", "All"],
            ["today", "Today"],
            ["tomorrow", "Tomorrow"],
            ["week", "This week"],
            ["month", "This month"],
          ]}
        />
        <Select
          label="Status"
          value={filters.status ?? "all"}
          onChange={(status) => push({ status })}
          options={[["all", "All statuses"], ...Object.entries(CASE_STATUS_LABELS).map(([id, label]) => [id, label.en] as [string, string])]}
        />
        <Select
          label="Staff"
          value={filters.staffId ?? "all"}
          onChange={(staffId) => push({ staffId })}
          options={[["all", "All staff"], ...staff.map((person) => [person.id, person.name || person.email] as [string, string])]}
        />
        <Select
          label="Closed by"
          value={filters.closedById ?? "all"}
          onChange={(closedById) => push({ closedById })}
          options={[["all", "Everyone"], ...staff.map((person) => [person.id, person.name || person.email] as [string, string])]}
        />
        <Select
          label="Service"
          value={filters.serviceId ?? "all"}
          onChange={(serviceId) => push({ serviceId })}
          options={[["all", "All services"], ["other", "Other"], ...services.map((service) => [service.id, service.name] as [string, string])]}
        />
        <Select
          label="Payment"
          value={filters.paymentStatus ?? "all"}
          onChange={(paymentStatus) => push({ paymentStatus })}
          options={[
            ["all", "Any payment"],
            ["unpaid", "Unpaid"],
            ["partial", "Partial"],
            ["paid", "Paid"],
          ]}
        />
        <Select
          label="Source"
          value={filters.source ?? "all"}
          onChange={(source) => push({ source })}
          options={[["all", "Any source"], ...LEAD_SOURCES.map((source) => [source, LEAD_SOURCE_LABELS[source]] as [string, string])]}
        />
        <button type="submit" className="min-h-11 rounded-lg bg-siam-blue text-white sm:col-span-2">
          Search
        </button>
      </form>

      <ul className="mt-4 space-y-3">
        {jobs.length === 0 && <li className="text-gray-500">No jobs match these filters.</li>}
        {jobs.map((job) => {
          const when = job.scheduledAt ? new Date(job.scheduledAt) : null;
          return (
            <li key={job.id}>
              <Link
                href={`/admin/jobs/${job.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{job.customerName || "Customer"}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{job.jobType}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">
                    {CASE_STATUS_LABELS[job.status]?.en ?? job.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-gray-500">Date</dt>
                  <dd>{when ? formatBangkokDate(when) : "TBD"}</dd>
                  <dt className="text-gray-500">Time</dt>
                  <dd>{when && !job.scheduleTimeTbd ? formatBangkokTime(when) : "TBD"}</dd>
                  <dt className="text-gray-500">Staff</dt>
                  <dd>{job.assignedStaff?.name || job.assignedStaff?.email || "TBD"}</dd>
                  <dt className="text-gray-500">Closed by</dt>
                  <dd>{job.closedBy?.name || job.closedBy?.email || "—"}</dd>
                  <dt className="text-gray-500">Total</dt>
                  <dd>{formatThb(job.totalSatang)}</dd>
                  <dt className="text-gray-500">Paid</dt>
                  <dd>{formatThb(job.paidSatang)}</dd>
                  <dt className="text-gray-500">Outstanding</dt>
                  <dd>{formatThb(job.outstandingSatang)}</dd>
                </dl>
                <p className="mt-2 text-xs text-gray-400">{job.caseNumber}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-between">
          <button
            type="button"
            className="min-h-11 px-3"
            disabled={page <= 1}
            onClick={() => push({ page: String(page - 1), search })}
          >
            Previous
          </button>
          <span className="self-center text-sm">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="min-h-11 px-3"
            disabled={page >= totalPages}
            onClick={() => push({ page: String(page + 1), search })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base dark:border-gray-700 dark:bg-gray-900"
      >
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
