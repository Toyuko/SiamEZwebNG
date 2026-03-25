import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCaseSelectOptions, getDocuments } from "@/actions/admin";
import { DocumentTable } from "./DocumentTable";
import { DocumentFilter } from "./DocumentFilter";
import { DocumentUpload } from "./DocumentUpload";

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

  const [{ documents, total, totalPages }, caseOptions] = await Promise.all([
    getDocuments({
      caseId,
      documentType,
      search,
      page,
    }),
    getCaseSelectOptions(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Documents
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        View and manage uploaded documents.
      </p>
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Upload document</CardTitle>
          <CardDescription>
            Case is optional — unassigned files can be linked to a case from that case&apos;s page. Files are stored on the
            server (Vercel Blob). Max size 10 MB per file. Requires{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">BLOB_READ_WRITE_TOKEN</code>{" "}
            in environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUpload cases={caseOptions} defaultCaseId={caseId} />
        </CardContent>
      </Card>
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
