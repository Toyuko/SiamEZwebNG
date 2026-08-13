import { getAdminVehicleLeads } from "@/actions/vehicle-leads";
import { VehicleLeadsDashboard } from "./VehicleLeadsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminVehicleLeadsPage() {
  const { leads, stats } = await getAdminVehicleLeads();
  return <VehicleLeadsDashboard leads={leads} stats={stats} />;
}
