import { Card, CardContent } from "@/components/ui/card";

export default function AdminClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">View and manage client accounts.</p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">No clients yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
