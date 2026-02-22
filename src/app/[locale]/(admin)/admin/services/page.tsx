import { getServices } from "@/actions/admin";
import { ServicesPageClient } from "./ServicesPageClient";

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;

  const services = await getServices({ search });

  return (
    <div>
      <ServicesPageClient services={services} search={search} />
    </div>
  );
}
