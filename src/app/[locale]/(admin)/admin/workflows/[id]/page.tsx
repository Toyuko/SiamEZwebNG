import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import {
  adminCreateWorkflowStep,
  adminDeleteWorkflowStep,
  adminDeleteWorkflowTemplate,
  adminUpdateWorkflowStep,
  adminUpdateWorkflowTemplate,
} from "@/actions/workflows";
import { getTemplateById } from "@/data-access/workflows";
import { WorkflowTemplateForm } from "../WorkflowTemplateForm";
import { StepForm } from "../StepForm";

export default async function AdminWorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    await adminUpdateWorkflowTemplate(id, formData);
    redirect(`/admin/workflows/${id}`);
  }

  async function deleteAction() {
    "use server";
    await adminDeleteWorkflowTemplate(id);
    redirect("/admin/workflows");
  }

  async function addStepAction(formData: FormData) {
    "use server";
    await adminCreateWorkflowStep(id, formData);
    redirect(`/admin/workflows/${id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/admin/workflows">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {template.titleEn}
        </h1>
        <p className="mt-1 font-mono text-sm text-gray-500">{template.key}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkflowTemplateForm
            action={updateAction}
            defaults={{
              key: template.key,
              titleEn: template.titleEn,
              titleTh: template.titleTh,
              descriptionEn: template.descriptionEn,
              descriptionTh: template.descriptionTh,
              active: template.active,
              sortOrder: template.sortOrder,
            }}
            submitLabel="Save changes"
          />
          <form action={deleteAction}>
            <Button type="submit" variant="outline" size="sm" className="text-red-600">
              Delete template
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Steps</h2>
        {template.steps.map((step) => {
          async function updateStepAction(formData: FormData) {
            "use server";
            await adminUpdateWorkflowStep(step.id, formData);
            redirect(`/admin/workflows/${id}`);
          }
          async function deleteStepAction() {
            "use server";
            await adminDeleteWorkflowStep(step.id);
            redirect(`/admin/workflows/${id}`);
          }
          return (
            <div key={step.id} className="space-y-2">
              <StepForm
                action={updateStepAction}
                defaults={{
                  key: step.key,
                  titleEn: step.titleEn,
                  titleTh: step.titleTh,
                  descriptionEn: step.descriptionEn,
                  descriptionTh: step.descriptionTh,
                  sortOrder: step.sortOrder,
                  kind: step.kind,
                  requiresApproval: step.requiresApproval,
                  targetJson: JSON.stringify(step.target ?? {}, null, 2),
                }}
                submitLabel="Update step"
              />
              <form action={deleteStepAction}>
                <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                  Delete step
                </Button>
              </form>
            </div>
          );
        })}

        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Add step
          </h3>
          <StepForm
            action={addStepAction}
            defaults={{
              sortOrder: template.steps.length + 1,
              kind: "action",
              targetJson: "{}",
            }}
            submitLabel="Add step"
          />
        </div>
      </section>
    </div>
  );
}
