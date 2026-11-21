import { FolderOpen, Users, CreditCard, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/admin/dashboard-overview";
import { DashboardMetric } from "@/components/admin/dashboard/DashboardMetric";
import { ActionRequiredPanel } from "@/components/admin/dashboard/ActionRequiredPanel";
import { FollowUpSummary } from "@/components/admin/dashboard/FollowUpSummary";
import { RecentCasesTable } from "@/components/admin/dashboard/RecentCasesTable";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  const [overview, session] = await Promise.all([getDashboardOverview(), getSession()]);
  const { kpis, actionRequired, recentCases, dlSummary } = overview;
  const firstName = session?.user.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome — compact, no giant hero */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#DCE6F5] bg-white px-5 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-siam-ink-muted">
            Manage cases, clients, team operations and finances from one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/calendar"
            className="inline-flex h-10 items-center rounded-xl border border-[#DCE6F5] px-3 text-sm font-semibold text-siam-ink hover:bg-siam-surface"
          >
            Calendar
          </Link>
          <Link
            href="/admin/jobs/new"
            prefetch
            className="inline-flex h-10 items-center rounded-xl bg-siam-yellow px-4 text-sm font-bold text-siam-navy shadow-soft"
          >
            + New Job
          </Link>
        </div>
      </section>

      {/* Core KPIs — only operational metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Open Cases"
          value={kpis.openCases}
          icon={FolderOpen}
          href="/admin/cases"
        />
        <DashboardMetric
          label="Clients"
          value={kpis.totalClients}
          icon={Users}
          href="/admin/clients"
        />
        <DashboardMetric
          label="Revenue"
          value={formatCurrency(kpis.revenue)}
          icon={CreditCard}
          href="/admin/financials"
          hint="Approved payments (all time)"
        />
        <DashboardMetric
          label="Pending Invoices"
          value={kpis.pendingInvoices}
          icon={FileText}
          href="/admin/invoices?status=unpaid"
        />
      </section>

      {/* Action Required + DL + Quick Actions */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <ActionRequiredPanel items={actionRequired} />
          <RecentCasesTable cases={recentCases} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <FollowUpSummary stats={dlSummary} />
          <QuickActions />
        </div>
      </section>
    </div>
  );
}
