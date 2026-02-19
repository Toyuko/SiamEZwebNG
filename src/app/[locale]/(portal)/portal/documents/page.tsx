import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getDocumentsByUserId } from "@/data-access/document";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { FileText } from "lucide-react";

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PortalDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const documents = await getDocumentsByUserId(session.user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("documents")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        All documents for your cases.
      </p>
      {documents.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No documents yet.</p>
            <Link
              href="/services"
              className="mt-4 text-sm font-medium text-siam-blue hover:underline"
            >
              Book a service
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-siam-blue/10">
                  <FileText className="h-5 w-5 text-siam-blue" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{doc.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {doc.case.service.name} • {doc.case.caseNumber}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                    {doc.size != null && ` • ${formatSize(doc.size)}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
