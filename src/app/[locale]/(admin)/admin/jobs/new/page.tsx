import { getServices, getStaffUsers } from "@/actions/admin";
import { JobIntakeForm } from "@/components/admin/jobs/JobIntakeForm";
import { isAssignableJobStaff } from "@/lib/jobs/intake";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const params = await searchParams;
  const [services, staff] = await Promise.all([getServices(), getStaffUsers()]);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date : "";
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(params.time ?? "") ? params.time : "";
  return (
    <JobIntakeForm
      mode="create"
      services={services.filter((service) => service.active).map((service) => ({ id: service.id, name: service.name }))}
      staff={staff.filter((person) => isAssignableJobStaff(person))}
      initial={{ scheduledDate: date, scheduledTime: time }}
    />
  );
}
