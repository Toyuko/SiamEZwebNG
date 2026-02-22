import { getStaffUsersAdmin } from "@/actions/admin";
import { StaffPageClient } from "./StaffPageClient";

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;

  const staff = await getStaffUsersAdmin({ search });

  return (
    <div>
      <StaffPageClient staff={staff} search={search} />
    </div>
  );
}
