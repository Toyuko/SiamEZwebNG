import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";
import { resolveDirectoryAccess } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Office Directory",
  description: "Find Thai government offices for licences, immigration, marriage registration, and related visits.",
};

export default async function DirectoryLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const access = await resolveDirectoryAccess();
  const copy = getDirectoryCopy(locale);

  return (
    <div className="min-h-screen bg-slate-50 text-foreground dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/directory" className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-siam-blue">SiamEZ</span>
            <span className="block truncate text-sm font-semibold md:text-base">{copy.brand}</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 text-sm font-medium">
            {access.userId ? (
              <Link href="/directory/favorites" className="rounded-lg px-2 py-2 hover:bg-slate-100">
                {copy.favorites}
              </Link>
            ) : (
              <Link
                href={{ pathname: "/login", query: { redirect: `/${locale}/directory/favorites` } }}
                className="rounded-lg px-2 py-2 hover:bg-slate-100"
              >
                {copy.signIn}
              </Link>
            )}
            {access.canContribute ? (
              <Link href="/directory/suggest" className="hidden rounded-lg px-2 py-2 hover:bg-slate-100 sm:inline">
                {copy.suggest}
              </Link>
            ) : null}
            {access.canManage ? (
              <Link href="/admin/directory" className="rounded-lg px-2 py-2 hover:bg-slate-100">
                {copy.manage}
              </Link>
            ) : null}
            <LanguageSwitcher />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
