import { getAdminSalesProperties } from "@/data-access/real-estate";
import { RealEstateDashboardClient } from "./real-estate-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminRealEstatePage() {
  const listings = await getAdminSalesProperties();

  return <RealEstateDashboardClient initialListings={listings} />;
}
