import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createEvent } from "@/actions/admin";
import { getCases } from "@/actions/admin";
import { getStaffUsers } from "@/actions/admin";
import { EventForm } from "../EventForm";

export default async function AdminNewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; date?: string; start?: string; end?: string; caseId?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  let defaultDate: Date;
  let defaultStart: Date | undefined;
  let defaultEnd: Date | undefined;

  if (params.start && params.end) {
    defaultStart = new Date(params.start);
    defaultEnd = new Date(params.end);
    defaultDate = defaultStart;
  } else if (params.date) {
    defaultDate = new Date(params.date + "T12:00:00");
  } else {
    const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
    const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
    defaultDate = new Date(year, month - 1, 1);
  }

  const [cases, staff] = await Promise.all([
    getCases({ status: "all", page: 1 }),
    getStaffUsers(),
  ]);

  async function handleSubmit(formData: FormData) {
    "use server";
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || undefined;
    const startStr = formData.get("start") as string;
    const endStr = formData.get("end") as string;
    const type = (formData.get("type") as "appointment" | "deadline" | "milestone") || "appointment";
    const caseId = (formData.get("caseId") as string) || undefined;
    const userId = (formData.get("userId") as string) || undefined;
    const staffId = (formData.get("staffId") as string) || undefined;

    if (!title || !startStr || !endStr) return;

    await createEvent({
      title,
      description: description || null,
      start: new Date(startStr),
      end: new Date(endStr),
      type,
      caseId: caseId || null,
      userId: userId || null,
      staffId: staffId || null,
    });
    redirect("/admin/calendar");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/calendar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add event
        </h1>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            action={handleSubmit}
            defaultDate={defaultDate}
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
            cases={cases.cases}
            staff={staff}
          />
        </CardContent>
      </Card>
    </div>
  );
}
