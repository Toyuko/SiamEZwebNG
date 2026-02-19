import Link from "next/link";
import { FolderOpen, Users, CreditCard, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminStats } from "@/actions/admin";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Dashboard
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Overview of cases, clients, and financials.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(stats.revenue)}
            </p>
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
      </div>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/admin/cases">View all cases</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/invoices">View invoices</Link>
        </Button>
      </div>
    </div>
  );
}
