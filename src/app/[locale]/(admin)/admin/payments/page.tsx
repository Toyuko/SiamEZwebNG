import { Card, CardContent } from "@/components/ui/card";
import { getPayments } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { PaymentTable } from "./PaymentTable";
import { PaymentFilter } from "./PaymentFilter";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as "submitted" | "approved" | "rejected")
      : undefined;
  const page = Number(params.page) || 1;

  const { payments, total, totalPages } = await getPayments({ status, page });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Payments
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        View all payments and review uploaded proofs.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <PaymentFilter defaultValue={params.status ?? "all"} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <PaymentTable
            payments={payments}
            total={total}
            page={page}
            totalPages={totalPages}
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
