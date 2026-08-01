import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getDocumentsByUserId } from "@/data-access/document";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { FileText, FolderOpen, CreditCard } from "lucide-react";

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
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("documents")}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t("documentsPageSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/cases">
              <FolderOpen className="h-4 w-4" />
              {t("myCases")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/invoices">
              <CreditCard className="h-4 w-4" />
              {t("invoices")}
            </Link>
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">{t("noDocumentsYet")}</p>
            <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
              {t("documentsEmptyHint")}
            </p>
            <Button asChild className="mt-4">
              <Link href="/services">{t("bookAService")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-siam-blue/10">
                  <FileText className="h-5 w-5 text-siam-blue" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{doc.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {doc.case
                      ? `${doc.case.service.name} · ${doc.case.caseNumber}`
                      : t("documentUnlinked")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString(
                      locale === "th" ? "th-TH" : "en-GB"
                    )}
                    {doc.size != null && ` · ${formatSize(doc.size)}`}
                  </p>
                </div>
                {doc.case && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/portal/cases/${doc.case.id}`}>{t("viewCase")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
