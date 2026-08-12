import { requireAuth } from "@/lib/auth";
import { getSalesPropertiesByOwner } from "@/data-access/real-estate";
import { RealEstateDashboardClient } from "@/app/[locale]/(admin)/admin/real-estate/real-estate-dashboard-client";

export const dynamic = "force-dynamic";

export default async function PortalRealEstatePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireAuth();
  const { edit } = await searchParams;
  const listings = await getSalesPropertiesByOwner(session.user.id);

  return (
    <RealEstateDashboardClient
      initialListings={listings}
      variant="seller"
      initialEditId={typeof edit === "string" ? edit : undefined}
    />
  );
}
