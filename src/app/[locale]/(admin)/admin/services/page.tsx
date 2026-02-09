import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminServicesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Manage service catalog: pricing, form config, and visibility.
      </p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">No services in database.</p>
          <p className="mt-2 text-sm text-gray-400">Run: npm run db:seed</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
