import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createService } from "@/actions/admin";
import { ServiceForm } from "../ServiceForm";

export default function AdminNewServicePage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    const slug = (formData.get("slug") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const shortDescription = (formData.get("shortDescription") as string)?.trim() || undefined;
    const description = (formData.get("description") as string)?.trim();
    const type = (formData.get("type") as "fixed" | "quote") || "quote";
    const priceStr = (formData.get("priceAmount") as string)?.trim();
    const priceAmount = priceStr ? Math.round(parseFloat(priceStr) * 100) : null;
    const active = formData.get("active") === "1";

    if (!slug || !name || !description) return;

    await createService({
      slug,
      name,
      shortDescription: shortDescription || null,
      description,
      type,
      priceAmount,
      active,
    });
    redirect("/admin/services");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add service
        </h1>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Service details</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm action={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
