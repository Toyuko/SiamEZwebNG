import { getServices, getStaffUsers } from "@/actions/admin";
import { JobIntakeForm } from "@/components/admin/jobs/JobIntakeForm";

export default async function NewJobPage() {
  const [services, staff] = await Promise.all([getServices(), getStaffUsers()]);
  return (
    <JobIntakeForm
      mode="create"
      services={services.filter((service) => service.active).map((service) => ({ id: service.id, name: service.name }))}
      staff={staff}
    />
  );
}
