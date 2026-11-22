import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy Cases list — consolidated into Work Center. */
export default async function AdminCasesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.status) {
    if (params.status === "awaiting_payment" || params.status === "awaiting_initial_payment") {
      qs.set("tab", "awaiting_payment");
    } else if (params.status === "pending_docs") {
      qs.set("tab", "awaiting_customer");
    } else if (params.status === "in_progress" || params.status === "confirmed") {
      qs.set("tab", "in_progress");
    } else if (params.status === "completed") {
      qs.set("tab", "completed");
    } else if (params.status === "cancelled") {
      qs.set("tab", "cancelled");
    }
  }
  if (params.search) qs.set("search", params.search);
  if (params.serviceId) qs.set("serviceId", params.serviceId);
  if (params.page) qs.set("page", params.page);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/admin/work-center${suffix}`);
}
