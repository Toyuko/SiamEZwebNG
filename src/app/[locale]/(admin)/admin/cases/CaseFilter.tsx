"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Select } from "@/components/ui/select";
import type { Service } from "@prisma/client";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All active" },
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "quoted", label: "Quoted" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_docs", label: "Pending docs" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function CaseFilter({
  statusDefault,
  serviceIdDefault,
  services,
}: {
  statusDefault?: string;
  serviceIdDefault?: string;
  services: Service[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const buildUrl = (status: string, svcId?: string, search?: string) => {
    const p = new URLSearchParams();
    if (status && status !== "all") p.set("status", status);
    if (svcId) p.set("serviceId", svcId);
    if (search) p.set("search", search);
    return `${pathname}${p.toString() ? `?${p}` : ""}`;
  };

  const getOtherParams = () => {
    if (typeof window === "undefined") return { serviceId: serviceIdDefault, search: undefined };
    const u = new URLSearchParams(window.location.search);
    return { serviceId: u.get("serviceId") ?? serviceIdDefault, search: u.get("search") ?? undefined };
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Status:
        </label>
        <Select
          id="status-filter"
          defaultValue={statusDefault ?? "all"}
          className="w-44"
          onChange={(e) => {
            const { serviceId: sid, search: s } = getOtherParams();
            router.push(buildUrl(e.target.value, sid ?? undefined, s));
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="service-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Service:
        </label>
        <Select
          id="service-filter"
          defaultValue={serviceIdDefault ?? ""}
          className="w-48"
          onChange={(e) => {
            const v = e.target.value;
            const { search: s } = getOtherParams();
            const u = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
            router.push(buildUrl(u?.get("status") ?? statusDefault ?? "all", v || undefined, s));
          }}
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
