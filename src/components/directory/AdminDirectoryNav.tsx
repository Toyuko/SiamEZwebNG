import { Link } from "@/i18n/navigation";
import { getDirectoryCopy, type DirectoryCopy } from "@/lib/directory/copy";
import { getLocale } from "next-intl/server";

const links = [
  { href: "/admin/directory", key: "adminTitle" },
  { href: "/admin/directory/new", key: "newOffice" },
  { href: "/admin/directory/import", key: "import" },
  { href: "/admin/directory/taxonomy", key: "taxonomy" },
  { href: "/admin/directory/reports", key: "reports" },
  { href: "/admin/directory/submissions", key: "submissions" },
  { href: "/admin/directory/access", key: "access" },
  { href: "/admin/directory/settings", key: "settings" },
] as const;

export async function AdminDirectoryNav() {
  const copy = getDirectoryCopy(await getLocale());
  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="shrink-0 rounded-full bg-white px-3 py-2 ring-1 ring-border">
          {copy[link.key as keyof DirectoryCopy] as string}
        </Link>
      ))}
      <Link href="/directory" className="shrink-0 rounded-full px-3 py-2 font-semibold text-siam-blue">
        {copy.view}
      </Link>
    </nav>
  );
}
