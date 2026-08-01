import { Link } from "@/i18n/navigation";
import { CalendarPlus, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type CaseEventRow = {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  type: string;
  staff?: { name: string | null } | null;
};

export function CaseSchedulePanel({
  caseId,
  events,
  labels,
}: {
  caseId: string;
  events: CaseEventRow[];
  labels: {
    title: string;
    empty: string;
    schedule: string;
    openCalendar: string;
    upcoming: string;
    past: string;
  };
}) {
  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const past = events
    .filter((e) => new Date(e.end).getTime() < now)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-siam-blue" aria-hidden />
          {labels.title}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/calendar?view=week`}>
              {labels.openCalendar}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/calendar/new?caseId=${encodeURIComponent(caseId)}`}>
              <CalendarPlus className="mr-1 h-4 w-4" aria-hidden />
              {labels.schedule}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">{labels.empty}</p>
        ) : (
          <>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {labels.upcoming}
              </h4>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-500">—</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <Link
                        href={`/admin/calendar/${e.id}`}
                        className="font-medium text-siam-blue hover:underline"
                      >
                        {e.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {e.type.replace(/_/g, " ")} · {new Date(e.start).toLocaleString()}
                        {e.staff?.name ? ` · ${e.staff.name}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {past.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {labels.past}
                </h4>
                <ul className="space-y-1">
                  {past.map((e) => (
                    <li key={e.id} className="text-sm text-gray-600 dark:text-gray-400">
                      <Link href={`/admin/calendar/${e.id}`} className="hover:underline">
                        {e.title}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {" "}
                        · {new Date(e.start).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
