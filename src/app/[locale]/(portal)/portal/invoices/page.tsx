import { Card, CardContent } from "@/components/ui/card";

export default function PortalInvoicesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">View and pay your invoices.</p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">No invoices yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
