import { getLocale } from "next-intl/server";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { OfficeForm } from "@/components/directory/OfficeForm";
import { listActiveCategories, listActiveServices } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function NewOfficePage() {
  const copy = getDirectoryCopy(await getLocale());
  const [categories, services] = await Promise.all([listActiveCategories(), listActiveServices()]);
  return (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.newOffice}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <OfficeForm copy={copy} categories={categories} services={services} />
    </main>
  );
}
