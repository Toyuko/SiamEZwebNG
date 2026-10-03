"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { DATE_PRESET_LABELS, type DatePreset } from "@/lib/finance/dates";
import { exportSalesReportAction, updateSalesSettingsAction } from "@/actions/sales-attribution";
import { Button } from "@/components/ui/button";
import type { SalesMetric } from "@/lib/finance/sales";

type Option = { id: string; name: string };

function downloadBase64(filename: string, base64: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SalesToolbar({
  services,
  salespeople,
  canManage,
  countCancelledAsSale,
  requireCloserOnAdminCreate,
  lockedSalesPersonId,
}: {
  services: Option[];
  salespeople: Option[];
  canManage: boolean;
  countCancelledAsSale: boolean;
  requireCloserOnAdminCreate: boolean;
  lockedSalesPersonId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const preset = (searchParams.get("preset") ?? "this_month") as DatePreset;
  const metric = (searchParams.get("metric") ?? "deals") as SalesMetric;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    if (key === "preset" && value !== "custom") {
      params.delete("start");
      params.delete("end");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function exportReport(format: "csv" | "xlsx") {
    start(async () => {
      const file = await exportSalesReportAction({
        preset,
        start: searchParams.get("start") ?? undefined,
        end: searchParams.get("end") ?? undefined,
        salesPersonId: lockedSalesPersonId ?? searchParams.get("salesPersonId") ?? undefined,
        serviceId: searchParams.get("serviceId") ?? undefined,
        caseStatus: searchParams.get("status") ?? undefined,
        paymentStanding: (searchParams.get("payment") ?? "") as
          | "unpaid"
          | "partial"
          | "paid"
          | "refunded"
          | "",
        paymentMethod: searchParams.get("method") ?? undefined,
        format,
      });
      downloadBase64(file.filename, file.base64, file.mime);
    });
  }

  const selectClass =
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">Period</span>
          <select className={selectClass} value={preset} onChange={(e) => setParam("preset", e.target.value)}>
            {DATE_PRESET_LABELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {preset === "custom" ? (
          <>
            <label className="text-sm">
              <span className="mb-1 block text-gray-500">Start</span>
              <input
                type="date"
                className={selectClass}
                defaultValue={searchParams.get("start") ?? ""}
                onChange={(e) => setParam("start", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-500">End</span>
              <input
                type="date"
                className={selectClass}
                defaultValue={searchParams.get("end") ?? ""}
                onChange={(e) => setParam("end", e.target.value)}
              />
            </label>
          </>
        ) : null}
        {canManage ? (
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">Salesperson</span>
            <select
              className={selectClass}
              value={searchParams.get("salesPersonId") ?? ""}
              onChange={(e) => setParam("salesPersonId", e.target.value)}
            >
              <option value="">All</option>
              {salespeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">Service</span>
          <select
            className={selectClass}
            value={searchParams.get("serviceId") ?? ""}
            onChange={(e) => setParam("serviceId", e.target.value)}
          >
            <option value="">All</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">Case status</span>
          <select
            className={selectClass}
            value={searchParams.get("status") ?? ""}
            onChange={(e) => setParam("status", e.target.value)}
          >
            <option value="">All</option>
            {["new", "in_progress", "completed", "cancelled", "refunded", "paid"].map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">Payment</span>
          <select
            className={selectClass}
            value={searchParams.get("payment") ?? ""}
            onChange={(e) => setParam("payment", e.target.value)}
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">Service matrix</span>
          <select className={selectClass} value={metric} onChange={(e) => setParam("metric", e.target.value)}>
            <option value="deals">Number of deals</option>
            <option value="dealValue">Deal value</option>
            <option value="collected">Collected revenue</option>
            <option value="averageDeal">Average deal value</option>
          </select>
        </label>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => exportReport("csv")}>
          Export CSV
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => exportReport("xlsx")}>
          Export Excel
        </Button>
      </div>
      {canManage ? (
        <form
          className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              await updateSalesSettingsAction({
                countCancelledAsSale: fd.get("countCancelled") === "on",
                requireCloserOnAdminCreate: fd.get("requireCloser") === "on",
              });
              router.refresh();
            });
          }}
        >
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="countCancelled" defaultChecked={countCancelledAsSale} />
            Count cancelled jobs as sales
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="requireCloser" defaultChecked={requireCloserOnAdminCreate} />
            Require closer on new admin jobs
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Save rules
          </Button>
        </form>
      ) : null}
    </div>
  );
}
