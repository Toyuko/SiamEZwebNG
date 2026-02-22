import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCaseByIdForUser } from "@/data-access/case";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CaseStatus } from "@prisma/client";

const statusLabels: Record<CaseStatus, string> = {
  new: "New",
  under_review: "Under Review",
  quoted: "Quoted",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  in_progress: "In Progress",
  pending_docs: "Pending Documents",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function PortalCaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const caseData = await getCaseByIdForUser(id, session.user.id);
  if (!caseData) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/portal/cases"
          className="text-sm font-medium text-siam-blue hover:underline"
        >
          ← {t("myCases")}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {caseData.caseNumber}
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">{caseData.service.name}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Case Details</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{statusLabels[caseData.status]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p>{new Date(caseData.createdAt).toLocaleDateString()}</p>
            </div>
            {caseData.completedAt && (
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p>{new Date(caseData.completedAt).toLocaleDateString()}</p>
              </div>
            )}
            {caseData.invoices.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-gray-500">Invoices</p>
                <ul className="space-y-1">
                  {caseData.invoices.map((inv) => (
                    <li key={inv.id} className="text-sm">
                      {inv.status} – {(inv.amount / 100).toFixed(2)} THB
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Documents</h2>
          </CardHeader>
          <CardContent>
            {caseData.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents yet.</p>
            ) : (
              <ul className="space-y-2">
                {caseData.documents.map((doc) => (
                  <li key={doc.id} className="text-sm">
                    {doc.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button asChild variant="primary">
          <Link href="/services">Book a New Service</Link>
        </Button>
      </div>
    </div>
  );
}
