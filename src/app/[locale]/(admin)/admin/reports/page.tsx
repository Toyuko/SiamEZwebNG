import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BarChart3,
  FolderOpen,
  FileText,
  CreditCard,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminReportMetrics } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { CaseStatusBadge } from "@/components/admin/CaseStatusBadge";

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        {icon}
        <p className="mt-2 text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatusTable({
  title,
  rows,
  showAmount,
  useCaseBadge,
}: {
  title: string;
  rows: { status: string; count: number; amount?: number }[];
  showAmount?: boolean;
  useCaseBadge?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">—</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800">
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Count</th>
              {showAmount ? <th className="py-2 font-medium">Amount</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.status} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2">
                  {useCaseBadge ? (
                    <CaseStatusBadge status={r.status} />
                  ) : (
                    <span className="capitalize">{r.status.replace(/_/g, " ")}</span>
                  )}
                </td>
                <td className="py-2">{r.count}</td>
                {showAmount ? (
                  <td className="py-2">{formatCurrency(r.amount ?? 0, "THB")}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function AdminReportsPage() {
  const [metrics, t] = await Promise.all([
    getAdminReportMetrics(),
    getTranslations("adminReports"),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/dashboard">{t("backDashboard")}</Link>
        </Button>
      </div>

      <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <TrendingUp className="h-5 w-5 text-siam-blue" aria-hidden />
        {t("overview")}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={<FolderOpen className="h-8 w-8 text-siam-blue" />}
          value={metrics.openCases}
          label={t("openCases")}
        />
        <MetricCard
          icon={<FolderOpen className="h-8 w-8 text-siam-blue" />}
          value={metrics.casesLast7}
          label={t("casesLast7")}
        />
        <MetricCard
          icon={<BarChart3 className="h-8 w-8 text-siam-blue" />}
          value={metrics.casesLast30}
          label={t("casesLast30")}
        />
        <MetricCard
          icon={<CreditCard className="h-8 w-8 text-siam-blue" />}
          value={formatCurrency(metrics.revenueLast30, "THB")}
          label={t("revenueLast30")}
        />
        <MetricCard
          icon={<CreditCard className="h-8 w-8 text-siam-blue" />}
          value={formatCurrency(metrics.revenueAllTime, "THB")}
          label={t("revenueAllTime")}
        />
        <MetricCard
          icon={<FileText className="h-8 w-8 text-siam-blue" />}
          value={metrics.documentCount}
          label={t("documents")}
        />
      </div>

      <div className="mt-4">
        <MetricCard
          icon={<CalendarDays className="h-8 w-8 text-siam-blue" />}
          value={metrics.upcomingEvents}
          label={t("upcomingEvents")}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-gray-900 dark:text-white">
        {t("breakdowns")}
      </h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <StatusTable
          title={t("casesByStatus")}
          rows={metrics.casesByStatus}
          useCaseBadge
        />
        <StatusTable
          title={t("invoicesByStatus")}
          rows={metrics.invoicesByStatus}
          showAmount
        />
        <StatusTable
          title={t("paymentsByStatus")}
          rows={metrics.paymentsByStatus}
          showAmount
        />
        <StatusTable
          title={t("quotesByStatus")}
          rows={metrics.quotesByStatus}
          showAmount
        />
      </div>
    </div>
  );
}
