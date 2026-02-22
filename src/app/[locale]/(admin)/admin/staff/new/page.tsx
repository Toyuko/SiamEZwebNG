import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createStaffUser } from "@/actions/admin";
import { StaffForm } from "../StaffForm";

export default function AdminNewStaffPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.trim();
    const name = (formData.get("name") as string)?.trim() || undefined;
    const password = (formData.get("password") as string)?.trim();
    const role = (formData.get("role") as "admin" | "staff") || "staff";

    if (!email || !password) return;

    await createStaffUser({
      email,
      name: name || null,
      password,
      role,
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
          Add staff
        </h1>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Staff details</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffForm action={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
