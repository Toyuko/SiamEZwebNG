import { listPublicIntakeOptions } from "@/data-access/job-intake";
import { JobIntakeForm } from "@/components/admin/jobs/JobIntakeForm";

export default async function StaffJobLinkPage() {
  const { services, staff } = await listPublicIntakeOptions();
  return <JobIntakeForm mode="create" access="link" services={services} staff={staff} />;
}
