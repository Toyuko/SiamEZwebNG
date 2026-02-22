import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClientById, updateClient } from "@/actions/admin";
import { ClientForm } from "../../ClientForm";

export default async function AdminEditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const name = (formData.get("name") as string) || undefined;
    const phone = (formData.get("phone") as string) || undefined;
    if (!email?.trim()) return;
    await updateClient(id, {
      email: email.trim(),
      name: name?.trim() || null,
      phone: phone?.trim() || null,
    });
    redirect("/admin/clients");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit client
        </h1>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{client.name ?? client.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            action={handleSubmit}
            defaultValues={{
              email: client.email,
              name: client.name,
              phone: client.phone,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
