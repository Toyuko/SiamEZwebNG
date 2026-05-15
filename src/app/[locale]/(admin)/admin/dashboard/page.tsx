import { Link } from "@/i18n/navigation";
import {
  FolderOpen,
  Users,
  CreditCard,
  FileText,
  Clock,
  UserCheck,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminStats, getRecentActivity, getRecentFreelancerJobs } from "@/actions/admin";
import { formatJobAmount } from "@/data-access/job";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

const jobStatusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Awaiting approval",
  approved: "Approved",
};

export default async function AdminDashboardPage() {
  const [stats, activity, recentFreelancerJobs] = await Promise.all([
    getAdminStats(),
    getRecentActivity(),
    getRecentFreelancerJobs(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Overview of cases, clients, freelancers, and financials.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">Operations</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <FolderOpen className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{stats.openCases}</p>
            <p className="text-sm text-gray-500">Open cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Users className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{stats.totalClients}</p>
            <p className="text-sm text-gray-500">Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CreditCard className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
            <p className="text-sm text-gray-500">Total revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{stats.pendingInvoices}</p>
            <p className="text-sm text-gray-500">Pending invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Clock className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{stats.pendingPayments}</p>
            <p className="text-sm text-gray-500">Payments to review</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">Freelancers</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <UserCheck className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{stats.totalFreelancers}</p>
            <p className="text-sm text-gray-500">Registered freelancers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Briefcase className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">{stats.openFreelancerJobs}</p>
            <p className="text-sm text-gray-500">Open freelancer jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="mt-2 text-2xl font-bold">{stats.pendingFreelancerApprovals}</p>
            <p className="text-sm text-gray-500">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent cases</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.recentCases.length === 0 ? (
              <p className="text-gray-500">No recent cases.</p>
            ) : (
              <ul className="space-y-2">
                {activity.recentCases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/cases/${c.id}`}
                      className="font-medium text-siam-blue hover:underline"
                    >
                      {c.caseNumber}
                    </Link>
                    <span className="ml-2 text-gray-500">
                      {c.service.name} ·{" "}
                      {c.user?.name ?? c.user?.email ?? c.guestName ?? c.guestEmail ?? "Guest"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/admin/cases">View all cases</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.recentPayments.length === 0 ? (
              <p className="text-gray-500">No recent payments.</p>
            ) : (
              <ul className="space-y-2">
                {activity.recentPayments.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/cases/${p.invoice.case.id}`}
                      className="font-medium text-siam-blue hover:underline"
                    >
                      {formatCurrency(p.amount)}
                    </Link>
                    <span className="ml-2 text-gray-500">
                      {p.invoice.case.caseNumber} ·{" "}
                      {p.invoice.user?.name ??
                        p.invoice.user?.email ??
                        p.invoice.case.guestName ??
                        p.invoice.case.guestEmail ??
                        "Client"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/admin/payments">View all payments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent freelancer jobs</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/freelancer-jobs">View all jobs</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentFreelancerJobs.length === 0 ? (
            <p className="text-gray-500">No freelancer jobs yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentFreelancerJobs.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/freelancer-jobs`}
                    className="font-medium text-siam-blue hover:underline"
                  >
                    {job.title}
                  </Link>
                  <span className="text-sm text-gray-500">
                    {formatJobAmount(job.amount, job.currency)} ·{" "}
                    {jobStatusLabel[job.status] ?? job.status} · Client:{" "}
                    {job.postedBy.name ?? job.postedBy.email}
                    {job.freelancer && (
                      <> · Freelancer: {job.freelancer.name ?? job.freelancer.email}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/freelancers">Manage freelancers</Link>
            </Button>
            {stats.pendingFreelancerApprovals > 0 && (
              <Button variant="primary" size="sm" asChild>
                <Link href="/admin/service-jobs?source=freelancer&status=completed_awaiting_review">
                  Review {stats.pendingFreelancerApprovals} pending approval
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/admin/cases">View all cases</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/freelancers">Freelancers</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/invoices">View invoices</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/payments">Review payments</Link>
        </Button>
      </div>
    </div>
  );
}
