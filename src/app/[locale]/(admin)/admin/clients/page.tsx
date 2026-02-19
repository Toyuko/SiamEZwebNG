import { Card, CardContent } from "@/components/ui/card";
import { getClients } from "@/actions/admin";
import { ClientTable } from "./ClientTable";

export default async function AdminClientsPage() {
  const clients = await getClients();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Clients
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        View and manage client accounts.
      </p>
      <Card className="mt-6">
        <CardContent className="p-0">
          <ClientTable clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
