"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  runFinancialAnalyticsAction,
  fetchAnalyticsDrillDownAction,
  exportAnalyticsCsvAction,
  saveFinancialReportAction,
  type AnalyticsConfigInput,
} from "@/actions/finance-analytics";
import {
  ALL_ANALYTICS_METRICS,
  DEFAULT_ANALYTICS_METRICS,
  type AnalyticsGroupBy,
  type AnalyticsMetric,
  type AnalyticsBucket,
} from "@/lib/finance/analytics";
import type { DatePreset } from "@/lib/finance/dates";
import { DATE_PRESET_LABELS } from "@/lib/finance/dates";
import type { CompareMode, DrillDownKind } from "@/lib/finance/analytics-query";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceTable, money } from "./FinanceUi";
import { AnalyticsMultiChart, type ChartType } from "./AnalyticsMultiChart";
import { Link } from "@/i18n/navigation";

type FilterOptions = {
  services: { id: string; name: string; slug: string }[];
  staff: { id: string; name: string | null; email: string }[];
  paymentMethods: string[];
  caseStatuses: string[];
};

const GROUP_OPTIONS: { value: AnalyticsGroupBy; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "hour", label: "Hour" },
  { value: "day_of_week", label: "Day of week" },
  { value: "service", label: "Service" },
  { value: "staff", label: "Staff" },
  { value: "case", label: "Case" },
  { value: "client", label: "Client" },
  { value: "expense_category", label: "Expense category" },
  { value: "payment_method", label: "Payment method" },
];

const METRIC_LABELS: Record<AnalyticsMetric, string> = {
  revenue: "Revenue",
  refunds: "Refunds",
  netRevenue: "Net revenue",
  staffCosts: "Staff costs",
  caseExpenses: "Job expenses",
  operatingExpenses: "Operating expenses",
  directCosts: "Direct costs",
  grossProfit: "Gross profit",
  netProfit: "Net profit",
  grossMargin: "Gross margin %",
  netMargin: "Net margin %",
  jobs: "Jobs",
  avgJobValue: "Avg job value",
  avgProfit: "Avg profit",
  staffCostPct: "Staff cost %",
  operatingCostPct: "OpEx %",
  paymentCount: "Payments",
};

function isMoneyMetric(m: AnalyticsMetric): boolean {
  return ![
    "grossMargin",
    "netMargin",
    "staffCostPct",
    "operatingCostPct",
    "jobs",
    "paymentCount",
  ].includes(m);
}

function formatMetric(m: AnalyticsMetric, v: number): string {
  if (isMoneyMetric(m)) return money(v);
  if (m.includes("Margin") || m.includes("Pct") || m.includes("pct"))
    return `${v}%`;
  return String(v);
}

type AnalyticsPayload = Awaited<ReturnType<typeof runFinancialAnalyticsAction>>;

export function AnalyticsBuilderClient({
  filterOptions,
  initialConfig,
  savedReportId,
}: {
  filterOptions: FilterOptions;
  initialConfig?: AnalyticsConfigInput;
  savedReportId?: string;
}) {
  const [preset, setPreset] = useState<DatePreset>(
    initialConfig?.preset ?? "this_month"
  );
  const [start, setStart] = useState(initialConfig?.start ?? "");
  const [end, setEnd] = useState(initialConfig?.end ?? "");
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>(
    initialConfig?.groupBy ?? "day"
  );
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>(
    initialConfig?.metrics?.length
      ? initialConfig.metrics
      : DEFAULT_ANALYTICS_METRICS
  );
  const [serviceId, setServiceId] = useState(initialConfig?.filters?.serviceId ?? "");
  const [staffId, setStaffId] = useState(initialConfig?.filters?.staffId ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    initialConfig?.filters?.paymentMethod ?? ""
  );
  const [caseStatus, setCaseStatus] = useState(
    initialConfig?.filters?.caseStatus ?? ""
  );
  const [compare, setCompare] = useState<CompareMode>(
    initialConfig?.compare ?? "previous_period"
  );
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [drillKind, setDrillKind] = useState<DrillDownKind | null>(null);
  const [drillRows, setDrillRows] = useState<
    Awaited<ReturnType<typeof fetchAnalyticsDrillDownAction>> | null
  >(null);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  const config = useMemo<AnalyticsConfigInput>(
    () => ({
      preset,
      start: preset === "custom" ? start : undefined,
      end: preset === "custom" ? end : undefined,
      groupBy,
      metrics,
      filters: {
        serviceId: serviceId || null,
        staffId: staffId || null,
        paymentMethod: paymentMethod || null,
        caseStatus: caseStatus || null,
      },
      compare,
      includeProjection: true,
    }),
    [
      preset,
      start,
      end,
      groupBy,
      metrics,
      serviceId,
      staffId,
      paymentMethod,
      caseStatus,
      compare,
    ]
  );

  const run = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await runFinancialAnalyticsAction(config);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      }
    });
  }, [config]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial + when user clicks Apply
  }, []);

  function toggleMetric(m: AnalyticsMetric) {
    setMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function openDrill(kind: DrillDownKind) {
    setDrillKind(kind);
    startTransition(async () => {
      const rows = await fetchAnalyticsDrillDownAction({
        ...config,
        kind,
        page: 1,
      });
      setDrillRows(rows);
    });
  }

  function exportCsv() {
    startTransition(async () => {
      const { filename, csv } = await exportAnalyticsCsvAction(config);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function saveReport() {
    if (!saveName.trim()) return;
    startTransition(async () => {
      await saveFinancialReportAction({
        id: savedReportId,
        name: saveName.trim(),
        config,
      });
      setSaveOpen(false);
      setSaveName("");
    });
  }

  const kpis = data?.kpis;
  const deltas = data?.comparison?.deltas;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom analytics builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="text-gray-500">Date range</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={preset}
                onChange={(e) => setPreset(e.target.value as DatePreset)}
              >
                {DATE_PRESET_LABELS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {preset === "custom" ? (
              <>
                <label className="block text-sm">
                  <span className="text-gray-500">Start</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-500">End</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </>
            ) : null}
            <label className="block text-sm">
              <span className="text-gray-500">Group by</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as AnalyticsGroupBy)}
              >
                {GROUP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Compare with</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={compare}
                onChange={(e) => setCompare(e.target.value as CompareMode)}
              >
                <option value="none">None</option>
                <option value="previous_period">Previous period</option>
                <option value="previous_month">Previous month</option>
                <option value="previous_year">Previous year</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Service</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">All</option>
                {filterOptions.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Staff</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              >
                <option value="">All</option>
                {filterOptions.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Payment method</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">All</option>
                {filterOptions.paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Case status</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={caseStatus}
                onChange={(e) => setCaseStatus(e.target.value)}
              >
                <option value="">All</option>
                {filterOptions.caseStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Chart type</span>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
              >
                <option value="bar">Bar</option>
                <option value="stacked">Stacked bar</option>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="pie">Pie / donut</option>
              </select>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-500">Metrics</p>
            <div className="flex flex-wrap gap-2">
              {ALL_ANALYTICS_METRICS.map((m) => (
                <label
                  key={m}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={metrics.includes(m)}
                    onChange={() => toggleMetric(m)}
                  />
                  {METRIC_LABELS[m]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={run} disabled={pending}>
              {pending ? "Loading…" : "Apply"}
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={pending}>
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveOpen((v) => !v)}
            >
              Save report
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/admin/financials/saved-reports">Saved reports</Link>
            </Button>
          </div>

          {saveOpen ? (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <label className="block text-sm">
                <span className="text-gray-500">Report name</span>
                <input
                  className="mt-1 block rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Monthly business performance"
                />
              </label>
              <Button type="button" size="sm" onClick={saveReport} disabled={pending}>
                Save
              </Button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      {kpis ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["netRevenue", "Revenue", "revenue"],
                ["grossProfit", "Gross profit", "profit"],
                ["netProfit", "Net profit", "profit"],
                ["staffCosts", "Staff costs", "staffCosts"],
                ["operatingExpenses", "Operating expenses", "operatingExpenses"],
                ["jobs", "Jobs", null],
                ["avgJobValue", "Avg job value", null],
                ["grossMargin", "Gross margin", null],
              ] as const
            ).map(([key, label, drill]) => {
              const value = kpis[key] as number;
              const delta = deltas?.[key];
              return (
                <button
                  key={key}
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-teal-500/50 dark:border-gray-800 dark:bg-gray-950"
                  onClick={() => drill && openDrill(drill)}
                  disabled={!drill}
                >
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {key === "jobs"
                      ? value
                      : key === "grossMargin"
                        ? `${value}%`
                        : formatCurrency(value)}
                  </p>
                  {delta ? (
                    <p
                      className={`mt-1 text-xs ${
                        (delta.percentChange ?? 0) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {delta.percentChange == null
                        ? "vs prior: n/a"
                        : `${delta.percentChange >= 0 ? "+" : ""}${delta.percentChange}% vs prior`}
                      {isMoneyMetric(key as AnalyticsMetric)
                        ? ` (${delta.absoluteChange >= 0 ? "+" : ""}${money(delta.absoluteChange)})`
                        : ""}
                    </p>
                  ) : null}
                  {drill ? (
                    <p className="mt-1 text-[10px] text-teal-700 dark:text-teal-300">
                      Click to drill down
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {data?.projection ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Period projection{" "}
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    Projected — not actual
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-gray-500">Current revenue</p>
                  <p className="font-medium tabular-nums">
                    {money(data.projection.currentRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Days elapsed</p>
                  <p className="font-medium">{data.projection.daysElapsed}</p>
                </div>
                <div>
                  <p className="text-gray-500">Avg daily</p>
                  <p className="font-medium tabular-nums">
                    {money(data.projection.averageDailyRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Projected period</p>
                  <p className="font-medium tabular-nums">
                    {money(data.projection.projectedPeriodRevenue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsMultiChart
                buckets={data?.buckets ?? []}
                metrics={metrics.filter((m) =>
                  [
                    "netRevenue",
                    "revenue",
                    "staffCosts",
                    "operatingExpenses",
                    "grossProfit",
                    "netProfit",
                    "jobs",
                    "caseExpenses",
                    "refunds",
                  ].includes(m)
                )}
                chartType={chartType}
              />
            </CardContent>
          </Card>

          <FinanceTable
            headers={[
              "Group",
              ...metrics.map((m) => METRIC_LABELS[m]),
            ]}
          >
            {(data?.buckets ?? []).map((b: AnalyticsBucket) => (
              <tr key={b.key} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="px-3 py-2 font-medium">{b.label}</td>
                {metrics.map((m) => (
                  <td key={m} className="px-3 py-2 tabular-nums">
                    {formatMetric(m, b[m] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </FinanceTable>
        </>
      ) : (
        <p className="text-sm text-gray-500">
          {pending ? "Loading analytics…" : "Apply filters to load analytics."}
        </p>
      )}

      {drillKind && drillRows ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-xl dark:bg-gray-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold capitalize">
                Drill-down · {drillKind.replace(/([A-Z])/g, " $1")}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDrillKind(null);
                  setDrillRows(null);
                }}
              >
                Close
              </Button>
            </div>
            <FinanceTable
              headers={["Date", "Type", "Description", "Case", "Amount", "Status"]}
            >
              {drillRows.rows.map((r) => (
                <tr key={`${r.source}-${r.id}`}>
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2">
                    {r.caseId ? (
                      <Link
                        href={`/admin/cases/${r.caseId}`}
                        className="text-teal-700 hover:underline dark:text-teal-300"
                      >
                        {r.caseNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{money(r.amount)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
            </FinanceTable>
            <p className="mt-2 text-xs text-gray-500">
              Showing {drillRows.rows.length} of {drillRows.total}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
