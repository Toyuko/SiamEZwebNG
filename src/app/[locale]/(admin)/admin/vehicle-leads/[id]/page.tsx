import { notFound } from "next/navigation";
import { getAdminVehicleLead, getStaffOptionsForVehicleLeads } from "@/actions/vehicle-leads";
import { VehicleLeadDetailClient } from "./VehicleLeadDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminVehicleLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, staff] = await Promise.all([
    getAdminVehicleLead(id),
    getStaffOptionsForVehicleLeads(),
  ]);
  if (!lead) notFound();
  return <VehicleLeadDetailClient lead={lead as never} staff={staff} />;
}
