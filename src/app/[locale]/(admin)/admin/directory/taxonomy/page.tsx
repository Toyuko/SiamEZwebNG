import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { TaxonomyManager } from "@/components/directory/TaxonomyManager";
import { requireDirectoryAdmin } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function TaxonomyPage() {
  await requireDirectoryAdmin();
  const copy = getDirectoryCopy(await getLocale());
  const [categories, services] = await Promise.all([
    prisma.govOfficeCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }),
    prisma.govOfficeService.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }),
  ]);
  return (
    <main className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.taxonomy}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <TaxonomyManager copy={copy} categories={categories} services={services} />
    </main>
  );
}
