import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { adminCreateLifeEvent } from "@/actions/life-events";
import { LifeEventForm } from "../LifeEventForm";

export default async function AdminNewLifeEventPage() {
  await requireStaff();

  async function handleSubmit(formData: FormData) {
    "use server";
    const event = await adminCreateLifeEvent(formData);
    redirect(`/admin/life-events/${event.id}`);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/life-events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add life event
        </h1>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Event definition</CardTitle>
        </CardHeader>
        <CardContent>
          <LifeEventForm action={handleSubmit} submitLabel="Create life event" />
        </CardContent>
      </Card>
    </div>
  );
}
