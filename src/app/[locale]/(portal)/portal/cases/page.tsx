import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalCasesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Cases</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Track the status of your bookings and upload documents.
      </p>
      <div className="mt-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">You have no cases yet.</p>
            <Button asChild className="mt-4">
              <Link href="/services">Book a service</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
