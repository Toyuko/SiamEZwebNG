import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { SuggestOfficeForm } from "@/components/directory/ContributeForms";
import { listActiveCategories, resolveDirectoryAccess } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function SuggestOfficePage() {
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);
  const access = await resolveDirectoryAccess();
  if (!access.canContribute) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold">{copy.suggest}</h1>
        <p className="mt-3 text-muted-foreground">{copy.suggestStaffOnly}</p>
        <Link href="/directory" className="mt-4 inline-block font-semibold text-siam-blue">
          {copy.brand}
        </Link>
      </main>
    );
  }
  const categories = await listActiveCategories();
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{copy.suggest}</h1>
      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-border dark:bg-slate-950">
        <SuggestOfficeForm copy={copy} categories={categories} />
      </div>
    </main>
  );
}
