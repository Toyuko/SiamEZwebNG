import { Link } from "@/i18n/navigation";
import { FolderOpen, Users, CreditCard, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminStats, getRecentActivity } from "@/actions/admin";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  const [stats, activity] = await Promise.all([getAdminStats(), getRecentActivity()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Dashboard
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Overview of cases, clients, and financials.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                      {c.service.name} · {c.user?.name ?? c.user?.email ?? c.guestName ?? c.guestEmail ?? "Guest"}
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
                      {p.invoice.case.caseNumber} · {p.invoice.user?.name ?? p.invoice.user?.email ?? p.invoice.case.guestName ?? p.invoice.case.guestEmail ?? "Client"}
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
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/admin/cases">View all cases</Link>
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
