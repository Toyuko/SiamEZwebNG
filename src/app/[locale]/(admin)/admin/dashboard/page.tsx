import { Briefcase, AlertTriangle, CreditCard, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/admin/dashboard-overview";
import { getWorkCenterSnapshot } from "@/data-access/work-center";
import { DashboardMetric } from "@/components/admin/dashboard/DashboardMetric";
import { ActionRequiredPanel } from "@/components/admin/dashboard/ActionRequiredPanel";
import { FollowUpSummary } from "@/components/admin/dashboard/FollowUpSummary";
import { RecentCasesTable } from "@/components/admin/dashboard/RecentCasesTable";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";

export default async function AdminDashboardPage() {
  const [overview, snapshot, session] = await Promise.all([
    getDashboardOverview(),
    getWorkCenterSnapshot(),
    getSession(),
  ]);
  const { actionRequired, recentCases, dlSummary } = overview;
  const firstName = session?.user.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-[#DCE6F5] bg-white px-5 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-siam-ink-muted">
            Your operations launchpad — jump into work that needs attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/work-center"
            prefetch
            className="inline-flex h-10 items-center rounded-xl border border-[#DCE6F5] px-3 text-sm font-semibold text-siam-ink hover:bg-siam-surface"
          >
            Work Center
          </Link>
          <Link
            href="/admin/calendar"
            prefetch
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Active work"
          value={snapshot.active}
          icon={Briefcase}
          href="/admin/work-center"
        />
        <DashboardMetric
          label="Needs action"
          value={snapshot.needsAction}
          icon={AlertTriangle}
          href="/admin/work-center?tab=needs_action"
        />
        <DashboardMetric
          label="Waiting for payment"
          value={snapshot.awaitingPayment}
          icon={CreditCard}
          href="/admin/work-center?tab=awaiting_payment"
        />
        <DashboardMetric
          label="Today's appointments"
          value={snapshot.todayAppointments}
          icon={CalendarDays}
          href="/admin/calendar"
        />
      </section>

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
