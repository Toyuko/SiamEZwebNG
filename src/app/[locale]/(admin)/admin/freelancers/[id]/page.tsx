import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getFreelancerByIdAdmin } from "@/actions/admin";
import { FreelancerDetailClient } from "./FreelancerDetailClient";

export default async function AdminFreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const freelancer = await getFreelancerByIdAdmin(id);
  if (!freelancer) notFound();

  return (
    <div>
      <Link
        href="/admin/freelancers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-siam-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to freelancers
      </Link>
      <FreelancerDetailClient freelancer={freelancer} />
    </div>
  );
}
