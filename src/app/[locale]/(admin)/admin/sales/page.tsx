import { getAdminSalesVehicles } from "@/data-access/sales";
import { SalesDashboardClient } from "./sales-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const listings = await getAdminSalesVehicles();

  return <SalesDashboardClient initialListings={listings} />;
}
