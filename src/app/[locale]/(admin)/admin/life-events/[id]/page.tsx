import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getLifeEventById } from "@/data-access/life-events";
import {
  adminCreateLifeEventStep,
  adminDeleteLifeEvent,
  adminDeleteLifeEventStep,
  adminUpdateLifeEvent,
  adminUpdateLifeEventStep,
} from "@/actions/life-events";
import { LifeEventForm } from "../LifeEventForm";
import { StepForm } from "../StepForm";
import { parseStepTarget, resolveStepTargetHref } from "@/lib/life-events";

export default async function AdminEditLifeEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const event = await getLifeEventById(id);
  if (!event) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await adminUpdateLifeEvent(id, formData);
    redirect(`/admin/life-events/${id}`);
  }

  async function handleDelete() {
    "use server";
    await adminDeleteLifeEvent(id);
    redirect("/admin/life-events");
  }

  async function handleAddStep(formData: FormData) {
    "use server";
    await adminCreateLifeEventStep(id, formData);
    redirect(`/admin/life-events/${id}`);
  }

  async function handleUpdateStep(formData: FormData) {
    "use server";
    const stepId = String(formData.get("stepId") ?? "").trim();
    if (!stepId) throw new Error("Missing step id");
    await adminUpdateLifeEventStep(stepId, formData);
    redirect(`/admin/life-events/${id}`);
  }

  async function handleDeleteStep(formData: FormData) {
    "use server";
    const stepId = String(formData.get("stepId") ?? "").trim();
    if (!stepId) throw new Error("Missing step id");
    await adminDeleteLifeEventStep(stepId);
    redirect(`/admin/life-events/${id}`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/life-events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {event.titleEn}
            </h1>
            <p className="font-mono text-xs text-gray-500">{event.key}</p>
          </div>
        </div>
        <form action={handleDelete}>
          <Button type="submit" variant="outline" className="text-red-600">
            Delete event
          </Button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Definition</CardTitle>
          </CardHeader>
          <CardContent>
            <LifeEventForm
              action={handleUpdate}
              defaults={event}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Steps ({event.steps.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {event.steps.map((step) => {
              const target = parseStepTarget(step.target);
              const href = resolveStepTargetHref(target, { preferBook: true });

              return (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      #{step.sortOrder} {step.titleEn}
                    </p>
                    <form action={handleDeleteStep}>
                      <input type="hidden" name="stepId" value={step.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                        Remove
                      </Button>
                    </form>
                  </div>
                  {href ? (
                    <p className="font-mono text-xs text-gray-500">{href}</p>
                  ) : null}
                  <StepForm
                    action={handleUpdateStep}
                    stepId={step.id}
                    defaults={step}
                    submitLabel="Update step"
                  />
                </div>
              );
            })}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Add step
              </h3>
              <StepForm
                action={handleAddStep}
                defaults={{ sortOrder: event.steps.length + 1 }}
                submitLabel="Add step"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
