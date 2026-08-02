import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { adminCreateWorkflowTemplate } from "@/actions/workflows";
import { WorkflowTemplateForm } from "../WorkflowTemplateForm";

export default async function AdminNewWorkflowPage() {
  await requireStaff();

  async function createAction(formData: FormData) {
    "use server";
    const template = await adminCreateWorkflowTemplate(formData);
    redirect(`/admin/workflows/${template.id}`);
  }

  return (
    <div>
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/admin/workflows">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        New workflow template
      </h1>
      <Card className="mt-6 max-w-2xl">
        <CardContent className="p-6">
          <WorkflowTemplateForm action={createAction} submitLabel="Create template" />
        </CardContent>
      </Card>
    </div>
  );
}
