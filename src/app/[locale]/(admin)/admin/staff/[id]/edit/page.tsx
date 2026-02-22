import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { updateStaffUser } from "@/actions/admin";
import { StaffFormEdit } from "../../StaffFormEdit";

export default async function AdminEditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await prisma.user.findFirst({
    where: { id, role: { in: ["admin", "staff"] } },
  });

  if (!staff) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim() || undefined;
    const role = (formData.get("role") as "admin" | "staff") || "staff";
    const activeStr = formData.get("active");
    const active = activeStr === "1";
    const password = (formData.get("password") as string)?.trim();

    await updateStaffUser(id, {
      name: name || null,
      role,
      active,
      ...(password ? { password } : {}),
    });
    redirect("/admin/staff");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/staff">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit staff
        </h1>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{staff.name ?? staff.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffFormEdit
            action={handleSubmit}
            defaultValues={{
              email: staff.email,
              name: staff.name,
              role: staff.role,
              active: staff.active,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
