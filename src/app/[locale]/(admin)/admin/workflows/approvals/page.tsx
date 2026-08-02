import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { listPendingApprovals } from "@/data-access/workflows";
import {
  staffApproveWorkflowStep,
  staffRejectWorkflowStep,
} from "@/actions/workflows";

export default async function AdminWorkflowApprovalsPage() {
  await requireStaff();
  const pending = await listPendingApprovals();

  return (
    <div>
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/admin/workflows">
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Link>
      </Button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Workflow approvals
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Staff review for steps that require approval before the run continues.
      </p>

      <div className="mt-6 space-y-4">
        {pending.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-gray-600 dark:text-gray-400">
              No steps awaiting approval.
            </CardContent>
          </Card>
        ) : (
          pending.map((item) => {
            async function approveAction() {
              "use server";
              await staffApproveWorkflowStep(item.id);
            }
            async function rejectAction(formData: FormData) {
              "use server";
              await staffRejectWorkflowStep(item.id, formData);
            }
            return (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-6">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.templateStep.titleEn}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Template: {item.run.template.titleEn} · Customer:{" "}
                      {item.run.user.name ?? item.run.user.email}
                    </p>
                    {item.run.linkedCase ? (
                      <p className="text-xs text-gray-500">
                        Linked case:{" "}
                        <Link
                          href={`/admin/cases/${item.run.linkedCase.id}`}
                          className="text-siam-blue hover:underline"
                        >
                          {item.run.linkedCase.caseNumber}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <form action={approveAction}>
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectAction} className="flex flex-wrap items-end gap-2">
                      <label className="block text-sm">
                        <span className="sr-only">Rejection reason</span>
                        <input
                          name="reason"
                          placeholder="Rejection reason (optional)"
                          className="w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        />
                      </label>
                      <Button type="submit" size="sm" variant="outline">
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
