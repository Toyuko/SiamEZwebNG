import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getCompanyByIdAdmin } from "@/actions/admin";
import { CompanyDetailClient } from "./CompanyDetailClient";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyUser = await getCompanyByIdAdmin(id);
  if (!companyUser) notFound();

  return (
    <div>
      <Link
        href="/admin/companies"
        className="mb-6 inline-flex items-center gap-2 text-sm text-siam-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to companies
      </Link>
      <CompanyDetailClient companyUser={companyUser} />
    </div>
  );
}
