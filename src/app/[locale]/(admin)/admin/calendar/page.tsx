import { Card, CardContent } from "@/components/ui/card";
import { getEvents, getCases, getStaffUsers } from "@/actions/admin";
import { CalendarView } from "./CalendarView";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; year?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = (params.view ?? "month") as "month" | "week" | "day";
  const now = new Date();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const dateParam = params.date;
  const centerDate = dateParam
    ? new Date(dateParam + "T12:00:00")
    : new Date(year, month - 1, 1);

  let start: Date;
  let end: Date;
  if (view === "week") {
    const day = centerDate.getDay();
    const diff = centerDate.getDate() - day;
    start = new Date(centerDate.getFullYear(), centerDate.getMonth(), diff, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (view === "day") {
    start = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate(), 0, 0, 0);
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0, 23, 59, 59);
  }

  const [events, casesData, staff] = await Promise.all([
    getEvents({ start, end }),
    getCases({ status: "all", page: 1 }),
    getStaffUsers(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Calendar
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Appointments, deadlines, and case milestones.
      </p>
      <Card className="mt-6">
        <CardContent className="p-4">
          <CalendarView
            events={events}
            cases={casesData.cases}
            staff={staff}
            view={view}
            month={month}
            year={year}
            date={centerDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
