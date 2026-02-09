import Link from "next/link";
import { FolderOpen, Users, CreditCard, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Overview of cases, clients, and financials.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <FolderOpen className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">0</p>
            <p className="text-sm text-gray-500">Open cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Users className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">0</p>
            <p className="text-sm text-gray-500">Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CreditCard className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">—</p>
            <p className="text-sm text-gray-500">Revenue (MTD)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <TrendingUp className="h-8 w-8 text-siam-blue" />
            <p className="mt-2 text-2xl font-bold">—</p>
            <p className="text-sm text-gray-500">Pending invoices</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Button asChild>
          <Link href="/admin/cases">View all cases</Link>
        </Button>
      </div>
    </div>
  );
}
