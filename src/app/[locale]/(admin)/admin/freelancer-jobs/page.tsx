import { redirect } from "next/navigation";

/** Legacy route — marketplace jobs live on Service Jobs with ?source=freelancer */
export default async function AdminFreelancerJobsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("source", "freelancer");
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", params.page);
  if (params.status) qs.set("status", params.status);
  redirect(`/admin/service-jobs?${qs.toString()}`);
}
