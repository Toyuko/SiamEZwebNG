import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { OfficeCard } from "@/components/directory/OfficeCard";
import { listFavoriteOffices, resolveDirectoryAccess } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function FavoritesPage() {
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);
  const access = await resolveDirectoryAccess();
  if (!access.userId) {
    redirect(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/directory/favorites`)}`);
  }
  const offices = await listFavoriteOffices(access.userId);
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{copy.favorites}</h1>
      {offices.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{copy.emptyFavorites}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {offices.map((office) => (
          <OfficeCard key={office.id} copy={copy} locale={locale} office={office} favorited signedIn />
        ))}
      </div>
    </main>
  );
}
