import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCaseById, getStaffUsers } from "@/actions/admin";
import { CaseDetailClient } from "@/app/[locale]/(admin)/admin/cases/[id]/CaseDetailClient";

export default async function AdminServiceJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [caseData, staffUsers] = await Promise.all([getCaseById(id), getStaffUsers()]);

  if (!caseData) notFound();

  const client = caseData.user;
  const displayName = client?.name ?? caseData.guestName ?? "Unknown";
  const displayEmail = client?.email ?? caseData.guestEmail ?? "—";
  const displayPhone = client?.phone ?? caseData.guestPhone ?? "—";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/service-jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {caseData.caseNumber}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {caseData.service.name} • {displayName}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <span className="font-medium">Name:</span> {displayName}
              </p>
              <p>
                <span className="font-medium">Email:</span> {displayEmail}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {displayPhone}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.documents.length === 0 ? (
                <p className="text-gray-500">No documents uploaded.</p>
              ) : (
                <ul className="space-y-1">
                  {caseData.documents.map((d) => (
                    <li key={d.id} className="text-sm">
                      {d.name}
                      {d.documentType && (
                        <span className="ml-2 text-gray-500">({d.documentType})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <CaseDetailClient
            caseId={caseData.id}
            caseNotes={caseData.caseNotes}
            staffUsers={staffUsers}
            caseData={caseData}
          />
        </div>
      </div>
    </div>
  );
}
