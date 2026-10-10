import { Link } from "@/i18n/navigation";
import { toggleFavorite } from "@/actions/directory";
import { StatusBadge } from "@/components/directory/StatusBadge";
import type { DirectoryCopy } from "@/lib/directory/copy";
import { provinceLabel } from "@/lib/directory/provinces";

export function OfficeCard({
  copy,
  locale,
  office,
  favorited,
  signedIn = false,
}: {
  copy: DirectoryCopy;
  locale: string;
  favorited?: boolean;
  signedIn?: boolean;
  office: {
    id: string;
    slug: string;
    nameEn: string | null;
    nameTh: string | null;
    provinceCode: string;
    district: string | null;
    phonePrimary: string | null;
    verificationStatus: string;
    archivedAt?: Date | null;
    category: { nameEn: string; nameTh: string };
    services: Array<{ service: { nameEn: string; nameTh: string } }>;
  };
}) {
  const title = locale === "th" ? office.nameTh || office.nameEn : office.nameEn || office.nameTh;
  const alt = locale === "th" ? office.nameEn : office.nameTh;
  const category = locale === "th" ? office.category.nameTh : office.category.nameEn;
  const services = office.services
    .slice(0, 3)
    .map((link) => (locale === "th" ? link.service.nameTh : link.service.nameEn));

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-foreground">
            <Link href={`/directory/${office.slug}`} className="hover:text-siam-blue">
              {title}
            </Link>
          </h2>
          {alt && alt !== title ? <p className="text-sm text-muted-foreground">{alt}</p> : null}
        </div>
        <StatusBadge status={office.verificationStatus} copy={copy} />
      </div>
      <p className="mt-3 text-sm text-foreground">
        {[office.district, provinceLabel(office.provinceCode, locale)].filter(Boolean).join(", ")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{office.phonePrimary || copy.noPhone}</p>
      {services.length ? <p className="mt-2 text-sm text-foreground">{services.join(" · ")}</p> : null}
      {office.archivedAt ? <p className="mt-2 text-xs font-medium text-rose-700">{copy.archived}</p> : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link href={`/directory/${office.slug}`} className="text-sm font-semibold text-siam-blue">
          {copy.open}
        </Link>
        {signedIn ? (
          <form action={toggleFavorite}>
            <input type="hidden" name="officeId" value={office.id} />
            <button type="submit" className="min-h-11 rounded-lg px-3 text-sm font-medium text-siam-blue">
              {favorited ? copy.savedFavorite : copy.saveFavorite}
            </button>
          </form>
        ) : (
          <Link
            href={{ pathname: "/login", query: { redirect: `/${locale}/directory/${office.slug}` } }}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-siam-blue"
          >
            {copy.signIn}
          </Link>
        )}
      </div>
    </article>
  );
}
