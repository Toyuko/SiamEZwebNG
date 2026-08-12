import { requireAuth } from "@/lib/auth";
import { getSalesVehiclesByOwner } from "@/data-access/sales";
import { SalesDashboardClient } from "@/app/[locale]/(admin)/admin/sales/sales-dashboard-client";

export const dynamic = "force-dynamic";

export default async function PortalSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireAuth();
  const { edit } = await searchParams;
  const listings = await getSalesVehiclesByOwner(session.user.id);

  return (
    <SalesDashboardClient
      initialListings={listings}
      variant="seller"
      initialEditId={typeof edit === "string" ? edit : undefined}
    />
  );
}
