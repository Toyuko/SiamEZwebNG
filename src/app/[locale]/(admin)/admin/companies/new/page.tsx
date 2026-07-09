import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompanyAdmin } from "@/actions/admin";

export default function AdminNewCompanyPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const companyName = String(formData.get("companyName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const password = String(formData.get("password") ?? "").trim() || undefined;
    const industry = String(formData.get("industry") ?? "").trim() || null;
    if (!email || !companyName) return;
    await createCompanyAdmin({ email, companyName, phone, password, industry });
    redirect("/admin/companies");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/companies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add company</h1>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company name *</Label>
              <Input id="companyName" name="companyName" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Login email *</Label>
              <Input id="email" name="email" type="email" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password (optional, for login)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="mt-1"
              />
            </div>
            <Button type="submit">Create company</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
