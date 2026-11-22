import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy case detail — consolidated into Work Center detail. */
export default async function AdminCaseDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/work-center/${id}`);
}
