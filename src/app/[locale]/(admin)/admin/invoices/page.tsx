import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getInvoices } from "@/actions/admin";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceFilter } from "./InvoiceFilter";

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as "draft" | "unpaid" | "pending_verification" | "paid" | "rejected")
      : undefined;
  const page = Number(params.page) || 1;

  const { invoices, total, totalPages } = await getInvoices({ status: status ?? "all", page });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invoices
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            View and manage invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/invoices/new">New invoice</Link>
        </Button>
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <InvoiceFilter defaultValue={params.status ?? "all"} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <InvoiceTable invoices={invoices} total={total} page={page} totalPages={totalPages} searchParams={params} />
        </CardContent>
      </Card>
    </div>
  );
}
