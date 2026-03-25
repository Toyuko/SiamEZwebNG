import { Card, CardContent } from "@/components/ui/card";
import {
  getPayments,
  getPaymentStats,
  getInvoicesForManualPayment,
} from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { PaymentTable } from "./PaymentTable";
import { PaymentStatusTabs } from "./PaymentStatusTabs";
import { PaymentsToolbar } from "./PaymentsToolbar";
import { Bell, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";

function effectiveTab(tab?: string, status?: string) {
  if (tab) return tab;
  const m: Record<string, string> = {
    submitted: "pending",
    approved: "paid",
    rejected: "failed",
    all: "all",
  };
  return status ? (m[status] ?? "all") : "all";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    page?: string;
    q?: string;
    method?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const tabUi = effectiveTab(params.tab, params.status);

  const [stats, invoiceOptions, paymentsResult] = await Promise.all([
    getPaymentStats(),
    getInvoicesForManualPayment(),
    getPayments({
      tab: params.tab,
      status: params.tab ? undefined : params.status,
      page,
      q: params.q,
      method: params.method,
    }),
  ]);

  const { payments, total, totalPages } = paymentsResult;

  const searchParamsForTable = {
    tab: params.tab,
    status: params.status,
    page: params.page,
    q: params.q,
    method: params.method,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payments &amp; Orders
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track payments, filter by status, and record manual payments.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <Link
            href="/admin/settings"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <PaymentStatusTabs currentTab={tabUi} q={params.q} method={params.method} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-gray-200 shadow-sm dark:border-gray-800">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.totalRevenue, "THB")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-gray-200 shadow-sm dark:border-gray-800">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalOrders}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-gray-200 shadow-sm dark:border-gray-800">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Payments</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pendingPayments}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-gray-200 shadow-sm dark:border-gray-800">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Paid Orders</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.paidOrders}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-xl border-gray-200 shadow-sm dark:border-gray-800">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Orders &amp; Payments</h2>
        </div>
        <CardContent className="space-y-4 p-5">
          <PaymentsToolbar
            defaultQ={params.q}
            defaultMethod={params.method}
            defaultTab={tabUi === "all" ? undefined : tabUi}
            invoices={invoiceOptions}
          />
          <PaymentTable
            payments={payments}
            total={total}
            page={page}
            totalPages={totalPages}
            searchParams={searchParamsForTable}
          />
        </CardContent>
      </Card>
    </div>
  );
}
