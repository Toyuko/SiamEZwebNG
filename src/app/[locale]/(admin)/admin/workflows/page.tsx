import Link from "next/link";
import { Plus, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { listTemplatesAdmin } from "@/data-access/workflows";

export default async function AdminWorkflowsPage() {
  await requireStaff();
  const templates = await listTemplatesAdmin();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Workflow templates
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Reusable cross-division workflows with optional staff approval gates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/workflows/approvals">
              <ClipboardCheck className="h-4 w-4" />
              Pending approvals
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/workflows/new">
              <Plus className="h-4 w-4" />
              Add template
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <p className="p-6 text-sm text-gray-600 dark:text-gray-400">
              No workflow templates yet. Seed includes vehicle inspection and property
              viewing booking flows.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Key
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Steps
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Runs
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/workflows/${tpl.id}`}
                        className="font-medium text-siam-blue hover:underline"
                      >
                        {tpl.titleEn}
                      </Link>
                      {tpl.titleTh ? (
                        <p className="text-xs text-gray-500">{tpl.titleTh}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {tpl.key}
                    </td>
                    <td className="px-4 py-3">{tpl.steps.length}</td>
                    <td className="px-4 py-3">
                      {tpl.active ? (
                        <span className="text-green-700 dark:text-green-400">Active</span>
                      ) : (
                        <span className="text-gray-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{tpl._count.runs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
