import { Card, CardContent } from "@/components/ui/card";
import { getDocuments } from "@/actions/admin";
import { DocumentTable } from "./DocumentTable";
import { DocumentFilter } from "./DocumentFilter";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string; documentType?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const caseId = params.caseId ?? undefined;
  const documentType = params.documentType ?? undefined;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;

  const { documents, total, totalPages } = await getDocuments({
    caseId,
    documentType,
    search,
    page,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Documents
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        View and manage uploaded documents.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <DocumentFilter defaultCaseId={caseId} defaultType={documentType} defaultSearch={search} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <DocumentTable
            documents={documents}
            total={total}
            page={page}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
