import Link from "next/link";
import { FolderOpen, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Welcome to your SiamEZ client portal. Manage your cases and documents here.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <FolderOpen className="h-10 w-10 text-siam-blue" />
            <h2 className="mt-4 font-semibold">My Cases</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View status and upload documents for your cases.
            </p>
            <Button asChild className="mt-4">
              <Link href="/portal/cases">View cases</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CreditCard className="h-10 w-10 text-siam-blue" />
            <h2 className="mt-4 font-semibold">Invoices</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View and pay your invoices.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/portal/invoices">View invoices</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <FileText className="h-10 w-10 text-siam-blue" />
            <h2 className="mt-4 font-semibold">Documents</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              All documents across your cases.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/portal/documents">View documents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Button asChild variant="primary" size="lg">
          <Link href="/services">Book a new service</Link>
        </Button>
      </div>
    </div>
  );
}
