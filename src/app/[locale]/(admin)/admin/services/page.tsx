import { Card, CardContent } from "@/components/ui/card";
import { getServices } from "@/actions/admin";
import { ServiceTable } from "./ServiceTable";

export default async function AdminServicesPage() {
  const services = await getServices();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Services
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Manage service catalog: pricing, type (fixed or quote), and visibility.
      </p>
      <Card className="mt-6">
        <CardContent className="p-0">
          <ServiceTable services={services} />
        </CardContent>
      </Card>
    </div>
  );
}
