"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  resolveDateRange,
  type DatePreset,
  DATE_PRESET_LABELS,
} from "@/lib/finance/dates";
import {
  DEFAULT_ANALYTICS_METRICS,
  type AnalyticsGroupBy,
  type AnalyticsMetric,
  type AnalyticsFilters,
} from "@/lib/finance/analytics";
import {
  runFinancialAnalytics,
  getAnalyticsDrillDown,
  type CompareMode,
  type DrillDownKind,
} from "@/lib/finance/analytics-query";
import { toCsv, satangToCsvBaht } from "@/lib/finance/csv";

async function requireFinanceAccess() {
  return requireStaff();
}

export type AnalyticsConfigInput = {
  preset?: DatePreset;
  start?: string;
  end?: string;
  groupBy?: AnalyticsGroupBy;
  metrics?: AnalyticsMetric[];
  filters?: AnalyticsFilters;
  compare?: CompareMode;
  compareStart?: string;
  compareEnd?: string;
  includeProjection?: boolean;
};

export async function runFinancialAnalyticsAction(input: AnalyticsConfigInput) {
  await requireFinanceAccess();
  const preset = input.preset ?? "this_month";
  const range = resolveDateRange(preset, input.start, input.end);
  const compareRange =
    input.compare === "custom" && input.compareStart && input.compareEnd
      ? resolveDateRange("custom", input.compareStart, input.compareEnd)
      : null;

  const result = await runFinancialAnalytics({
    range,
    groupBy: input.groupBy ?? "day",
    filters: input.filters ?? {},
    compare: input.compare ?? "none",
    compareRange,
    includeProjection: input.includeProjection ?? true,
  });

  return {
    ...result,
    range: {
      start: result.range.start.toISOString(),
      end: result.range.end.toISOString(),
    },
    comparison: result.comparison
      ? {
          ...result.comparison,
          range: result.comparison.range
            ? {
                start: result.comparison.range.start.toISOString(),
                end: result.comparison.range.end.toISOString(),
              }
            : null,
        }
      : null,
    metrics: input.metrics?.length ? input.metrics : DEFAULT_ANALYTICS_METRICS,
    preset,
  };
}

export async function fetchAnalyticsDrillDownAction(input: {
  preset?: DatePreset;
  start?: string;
  end?: string;
  filters?: AnalyticsFilters;
  kind: DrillDownKind;
  page?: number;
}) {
  await requireFinanceAccess();
  const range = resolveDateRange(
    input.preset ?? "this_month",
    input.start,
    input.end
  );
  return getAnalyticsDrillDown({
    range,
    filters: input.filters,
    kind: input.kind,
    page: input.page ?? 1,
  });
}

export async function exportAnalyticsCsvAction(input: AnalyticsConfigInput) {
  await requireFinanceAccess();
  const data = await runFinancialAnalyticsAction(input);
  const metrics = data.metrics;
  const headers = ["Group", ...metrics];
  const rows = data.buckets.map((b) => [
    b.label,
    ...metrics.map((m) => {
      const v = b[m];
      if (
        m === "grossMargin" ||
        m === "netMargin" ||
        m === "staffCostPct" ||
        m === "operatingCostPct" ||
        m === "jobs" ||
        m === "paymentCount"
      ) {
        return v;
      }
      return satangToCsvBaht(v as number);
    }),
  ]);
  const csv = toCsv(headers, rows);
  return {
    filename: `siamez-analytics-${data.groupBy}.csv`,
    csv,
  };
}

export async function listSavedFinancialReportsAction() {
  const session = await requireFinanceAccess();
  return prisma.savedFinancialReport.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveFinancialReportAction(input: {
  id?: string;
  name: string;
  description?: string;
  config: AnalyticsConfigInput;
}) {
  const session = await requireFinanceAccess();
  if (!input.name.trim()) throw new Error("Name is required");

  if (input.id) {
    const existing = await prisma.savedFinancialReport.findFirst({
      where: { id: input.id, ownerId: session.user.id },
    });
    if (!existing) throw new Error("Report not found");
    await prisma.savedFinancialReport.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        description: input.description ?? null,
        config: input.config as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.savedFinancialReport.create({
      data: {
        ownerId: session.user.id,
        name: input.name.trim(),
        description: input.description ?? null,
        config: input.config as Prisma.InputJsonValue,
      },
    });
  }
  revalidatePath("/admin/financials/saved-reports");
  revalidatePath("/admin/financials/analytics");
  return { ok: true as const };
}

export async function deleteSavedFinancialReportAction(id: string) {
  const session = await requireFinanceAccess();
  const existing = await prisma.savedFinancialReport.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!existing) throw new Error("Report not found");
  await prisma.savedFinancialReport.delete({ where: { id } });
  revalidatePath("/admin/financials/saved-reports");
  return { ok: true as const };
}

export async function getFinancialDashboardPrefsAction() {
  const session = await requireFinanceAccess();
  const row = await prisma.financialDashboardPreference.findUnique({
    where: { ownerId: session.user.id },
  });
  return (
    (row?.preferences as {
      kpiOrder?: string[];
      hiddenKpis?: string[];
      defaultPreset?: DatePreset;
      defaultGroupBy?: AnalyticsGroupBy;
      hiddenCharts?: string[];
    } | null) ?? {
      kpiOrder: [
        "netRevenue",
        "grossProfit",
        "netProfit",
        "staffCosts",
        "operatingExpenses",
        "jobs",
      ],
      hiddenKpis: [],
      defaultPreset: "this_month" as DatePreset,
      defaultGroupBy: "day" as AnalyticsGroupBy,
      hiddenCharts: [],
    }
  );
}

export async function saveFinancialDashboardPrefsAction(preferences: {
  kpiOrder?: string[];
  hiddenKpis?: string[];
  defaultPreset?: DatePreset;
  defaultGroupBy?: AnalyticsGroupBy;
  hiddenCharts?: string[];
}) {
  const session = await requireFinanceAccess();
  await prisma.financialDashboardPreference.upsert({
    where: { ownerId: session.user.id },
    create: {
      ownerId: session.user.id,
      preferences: preferences as Prisma.InputJsonValue,
    },
    update: { preferences: preferences as Prisma.InputJsonValue },
  });
  revalidatePath("/admin/financials");
  return { ok: true as const };
}

export async function getAnalyticsFilterOptionsAction() {
  await requireFinanceAccess();
  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "staff", "freelancer"] }, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    services,
    staff,
    presets: DATE_PRESET_LABELS,
    paymentMethods: [
      "qr",
      "bank",
      "wise",
      "stripe",
      "cash",
      "credit_card",
      "debit_card",
      "other",
    ],
    caseStatuses: [
      "new",
      "under_review",
      "quoted",
      "awaiting_payment",
      "paid",
      "in_progress",
      "completed",
      "cancelled",
      "refunded",
    ],
  };
}
