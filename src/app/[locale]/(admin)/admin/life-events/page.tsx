import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { listLifeEventsAdmin } from "@/data-access/life-events";

export default async function AdminLifeEventsPage() {
  await requireStaff();
  const events = await listLifeEventsAdmin();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Life Events
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Configurable customer journeys — edit without deploy.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/life-events/new">
            <Plus className="h-4 w-4" />
            Add life event
          </Link>
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="p-6 text-sm text-gray-600 dark:text-gray-400">
              No life events yet. Create one to define an ordered checklist of
              services and marketplace links.
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
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/life-events/${event.id}`}
                        className="font-medium text-siam-blue hover:underline"
                      >
                        {event.titleEn}
                      </Link>
                      {event.titleTh ? (
                        <p className="text-xs text-gray-500">{event.titleTh}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {event.key}
                    </td>
                    <td className="px-4 py-3">{event.steps.length}</td>
                    <td className="px-4 py-3">
                      {event.active ? (
                        <span className="text-green-700 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="text-gray-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{event._count.progress}</td>
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
