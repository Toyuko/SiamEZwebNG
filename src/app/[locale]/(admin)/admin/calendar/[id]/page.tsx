import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { updateEvent, deleteEvent } from "@/actions/admin";
import { EventForm } from "../EventForm";
import { getCases } from "@/actions/admin";
import { getStaffUsers } from "@/actions/admin";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      case: { select: { caseNumber: true } },
      user: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  if (!event) notFound();

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
    const staffId = (formData.get("staffId") as string) || undefined;

    if (!title || !startStr || !endStr) return;

    await updateEvent(id, {
      title,
      description: description || null,
      start: new Date(startStr),
      end: new Date(endStr),
      type,
      caseId: caseId || null,
      staffId: staffId || null,
    });
    redirect("/admin/calendar");
  }

  async function handleDelete() {
    "use server";
    await deleteEvent(id);
    redirect("/admin/calendar");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/calendar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {event.title}
          </h1>
        </div>
        <form action={handleDelete}>
          <Button type="submit" variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </form>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            action={handleSubmit}
            defaultDate={event.start}
            defaultValues={{
              title: event.title,
              description: event.description,
              start: event.start,
              end: event.end,
              type: event.type,
              caseId: event.caseId,
              staffId: event.staffId,
            }}
            cases={cases.cases}
            staff={staff}
          />
        </CardContent>
      </Card>
    </div>
  );
}
