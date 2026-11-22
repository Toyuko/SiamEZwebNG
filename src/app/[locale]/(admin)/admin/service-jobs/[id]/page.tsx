import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy service-job detail — consolidated into Work Center. */
export default async function AdminServiceJobDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/work-center/${id}`);
}