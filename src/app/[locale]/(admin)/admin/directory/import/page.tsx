import { getLocale } from "next-intl/server";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { ImportExportPanel } from "@/components/directory/ImportExportPanel";
import { getDirectoryCopy } from "@/lib/directory/copy";
import { parseDirectoryQuery } from "@/lib/directory/search";

export default async function DirectoryImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const copy = getDirectoryCopy(await getLocale());
  const query = parseDirectoryQuery(await searchParams);
  return (
    <main className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.import}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <ImportExportPanel copy={copy} query={query} />
    </main>
  );
}
