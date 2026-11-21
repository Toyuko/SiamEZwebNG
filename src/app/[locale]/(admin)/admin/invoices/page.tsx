import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getInvoices } from "@/actions/admin";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
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
    <AdminPageShell
      title="Invoices & Payments"
      description="Outstanding invoices, payment status, and review queues."
      actions={
        <Button asChild variant="primary">
          <Link href="/admin/invoices/new">Create Invoice</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <InvoiceFilter defaultValue={params.status ?? "all"} />
      </div>
      <Card className="overflow-hidden rounded-2xl border-[#DCE6F5] shadow-soft">
        <CardContent className="p-0">
          <InvoiceTable invoices={invoices} total={total} page={page} totalPages={totalPages} searchParams={params} />
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
