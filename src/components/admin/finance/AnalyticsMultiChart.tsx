"use client";

import { money } from "./FinanceUi";
import type { AnalyticsBucket, AnalyticsMetric } from "@/lib/finance/analytics";

export type ChartType = "bar" | "line" | "area" | "pie" | "stacked";

const METRIC_COLORS: Record<string, string> = {
  netRevenue: "#0d9488",
  revenue: "#14b8a6",
  staffCosts: "#f59e0b",
  caseExpenses: "#f97316",
  operatingExpenses: "#ef4444",
  grossProfit: "#10b981",
  netProfit: "#059669",
  jobs: "#6366f1",
  avgJobValue: "#8b5cf6",
  refunds: "#e11d48",
  directCosts: "#d97706",
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

export function AnalyticsMultiChart({
  buckets,
  metrics,
  chartType,
}: {
  buckets: AnalyticsBucket[];
  metrics: AnalyticsMetric[];
  chartType: ChartType;
}) {
  if (buckets.length === 0) {
    return <p className="text-sm text-gray-500">No data for this selection.</p>;
  }

  if (chartType === "pie") {
    const metric = metrics[0] ?? "netRevenue";
    const total = buckets.reduce((s, b) => s + Math.abs(b[metric] as number), 0) || 1;
    let acc = 0;
    const slices = buckets
      .filter((b) => (b[metric] as number) !== 0)
      .slice(0, 12)
      .map((b, i) => {
        const v = Math.abs(b[metric] as number);
        const start = (acc / total) * 360;
        acc += v;
        const end = (acc / total) * 360;
        return { ...b, start, end, color: `hsl(${(i * 47) % 360} 55% 45%)`, value: v };
      });

    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          className="h-48 w-48 shrink-0 rounded-full"
          style={{
            background:
              slices.length === 0
                ? "#e5e7eb"
                : `conic-gradient(${slices
                    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
                    .join(", ")})`,
          }}
          title={metric}
        />
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="truncate">{s.label}</span>
              <span className="ml-auto tabular-nums text-gray-500">
                {isMoneyMetric(metric) ? money(s.value) : s.value}
                {" · "}
                {Math.round((s.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const max = Math.max(
    1,
    ...buckets.flatMap((b) => metrics.map((m) => Math.abs(b[m] as number)))
  );

  if (chartType === "line" || chartType === "area") {
    const w = Math.max(400, buckets.length * 48);
    const h = 200;
    const pad = 24;
    const series = metrics.map((m) => {
      const pts = buckets.map((b, i) => {
        const x = pad + (i / Math.max(1, buckets.length - 1)) * (w - pad * 2);
        const y = h - pad - ((Math.abs(b[m] as number) / max) * (h - pad * 2));
        return `${x},${y}`;
      });
      return { m, points: pts.join(" "), color: METRIC_COLORS[m] ?? "#64748b" };
    });

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="min-w-full" height={200}>
          {series.map((s) =>
            chartType === "area" ? (
              <polygon
                key={s.m}
                points={`${pad},${h - pad} ${s.points} ${w - pad},${h - pad}`}
                fill={s.color}
                opacity={0.2}
              />
            ) : null
          )}
          {series.map((s) => (
            <polyline
              key={`l-${s.m}`}
              points={s.points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
            />
          ))}
        </svg>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
          {metrics.map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: METRIC_COLORS[m] ?? "#64748b" }}
              />
              {m}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // bar / stacked
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {metrics.map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: METRIC_COLORS[m] ?? "#64748b" }}
            />
            {m}
          </span>
        ))}
      </div>
      <div
        className="flex items-end gap-2 overflow-x-auto pb-2"
        style={{ minHeight: 180 }}
      >
        {buckets.map((b) => (
          <div
            key={b.key}
            className="flex min-w-[56px] flex-1 flex-col items-center gap-1"
          >
            {chartType === "stacked" ? (
              <div
                className="flex w-8 flex-col-reverse overflow-hidden rounded-t"
                style={{ height: 140 }}
              >
                {metrics.map((m) => {
                  const v = Math.abs(b[m] as number);
                  const pct = (v / max) * 100;
                  return (
                    <div
                      key={m}
                      title={`${m}: ${isMoneyMetric(m) ? money(v) : v}`}
                      style={{
                        height: `${Math.max(v ? 2 : 0, pct)}%`,
                        background: METRIC_COLORS[m] ?? "#64748b",
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 w-full items-end justify-center gap-0.5">
                {metrics.map((m) => {
                  const v = Math.abs(b[m] as number);
                  return (
                    <div
                      key={m}
                      className="w-2.5 rounded-t"
                      style={{
                        height: `${Math.max(2, (v / max) * 100)}%`,
                        background: METRIC_COLORS[m] ?? "#64748b",
                      }}
                      title={`${m}: ${isMoneyMetric(m) ? money(v) : v}`}
                    />
                  );
                })}
              </div>
            )}
            <span className="max-w-[64px] truncate text-[10px] text-gray-500">
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
