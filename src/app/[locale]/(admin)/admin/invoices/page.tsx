import { Card, CardContent } from "@/components/ui/card";
import { getInvoices } from "@/actions/admin";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceFilter } from "./InvoiceFilter";

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as "draft" | "sent" | "paid" | "overdue" | "cancelled")
      : undefined;

  const invoices = await getInvoices(status ?? "all");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Invoices
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        View and manage invoices.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <InvoiceFilter defaultValue={params.status ?? "all"} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <InvoiceTable invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  );
}
