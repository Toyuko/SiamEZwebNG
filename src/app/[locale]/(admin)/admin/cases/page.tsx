import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getCases } from "@/actions/admin";
import { CaseTable } from "./CaseTable";
import { CaseFilter } from "./CaseFilter";

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as "new" | "under_review" | "quoted" | "awaiting_payment" | "paid" | "in_progress" | "pending_docs" | "completed" | "cancelled")
      : undefined;

  const cases = await getCases(status ?? "all");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Cases
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Manage all cases: status, assignments, notes, and documents.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CaseFilter defaultValue={params.status ?? "all"} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <CaseTable cases={cases} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
