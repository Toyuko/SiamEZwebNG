import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getServiceBySlug } from "@/data-access/service";
import { Button } from "@/components/ui/button";

export default async function BookServiceEntryPage({
  params,
}: {
  params: Promise<{ serviceSlug: string }>;
}) {
  const { serviceSlug } = await params;
  const service = await getServiceBySlug(serviceSlug);
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book: {service.name}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        You will be guided through a short booking wizard. Have your details and documents ready.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild size="lg">
          <Link href={`/book/${serviceSlug}`}>Start booking</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/services/${serviceSlug}`}>Back to service</Link>
        </Button>
      </div>
    </div>
  );
}
