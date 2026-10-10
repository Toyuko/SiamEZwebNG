import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { OfficeCard } from "@/components/directory/OfficeCard";
import { OfficeMap } from "@/components/directory/OfficeMap";
import { SearchBox } from "@/components/directory/SearchBox";
import {
  ensureDirectoryStarterData,
  favoriteIdSet,
  listActiveCategories,
  listActiveServices,
  listDistricts,
  listFavoriteOffices,
  listRecentOffices,
  listRecentlyUpdatedOffices,
  listDirectoryMapPoints,
  resolveDirectoryAccess,
  searchDirectoryOffices,
} from "@/data-access/directory";
import { fill, getDirectoryCopy, type DirectoryCopy } from "@/lib/directory/copy";
import { hasActiveDirectoryFilters, parseDirectoryQuery } from "@/lib/directory/search";
import { provincesByRegion } from "@/lib/directory/provinces";
import { isVerificationStale } from "@/lib/directory/constants";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);
  const access = await resolveDirectoryAccess();
  await ensureDirectoryStarterData();

  const query = parseDirectoryQuery(params);
  const view = params.view === "grid" || params.view === "map" ? params.view : "list";
  const [result, categories, services, districts, favorites, recent, updated] = await Promise.all([
    hasActiveDirectoryFilters(query) || view === "map"
      ? searchDirectoryOffices(query)
      : Promise.resolve(null),
    listActiveCategories(),
    listActiveServices(),
    listDistricts(query.province || undefined),
    access.userId ? listFavoriteOffices(access.userId) : Promise.resolve([]),
    access.userId ? listRecentOffices(access.userId) : Promise.resolve([]),
    listRecentlyUpdatedOffices(),
  ]);
  const offices = result?.offices ?? [];
  const favoriteIds = access.userId
    ? await favoriteIdSet(
        access.userId,
        offices.map((office) => office.id)
      )
    : new Set<string>();
  const showDashboard = !hasActiveDirectoryFilters(query) && view !== "map";
  const mapPoints = view === "map" ? await listDirectoryMapPoints(query) : [];
  const queryRecord = {
    q: query.q,
    province: query.province,
    district: query.district,
    category: query.category,
    service: query.service,
    area: query.area,
    status: query.status,
    sort: query.sort === "updated" ? undefined : query.sort,
    view: view === "list" ? undefined : view,
  };

  const selectClass = "mt-1 h-11 w-full rounded-lg border border-border bg-white px-2 text-sm dark:bg-slate-950";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <form className="space-y-4" method="get">
        <SearchBox defaultValue={query.q} placeholder={copy.searchPlaceholder} label={copy.search} />
        {view !== "list" ? <input type="hidden" name="view" value={view} /> : null}
        <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-3 xl:grid-cols-6 dark:bg-slate-950">
          <label className="text-xs font-medium text-muted-foreground">
            {copy.province}
            <select name="province" defaultValue={query.province} className={selectClass}>
              <option value="">{copy.all}</option>
              {provincesByRegion().map((group) => (
                <optgroup key={group.region} label={copy.regions[group.region]}>
                  {group.provinces.map((province) => (
                    <option key={province.code} value={province.code}>
                      {locale === "th" ? province.nameTh : province.nameEn}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {copy.district}
            <input name="district" list="directory-districts" defaultValue={query.district} className={selectClass} />
            <datalist id="directory-districts">
              {districts.map((district) => (
                <option key={district} value={district} />
              ))}
            </datalist>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {copy.category}
            <select name="category" defaultValue={query.category} className={selectClass}>
              <option value="">{copy.all}</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {locale === "th" ? category.nameTh : category.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {copy.service}
            <select name="service" defaultValue={query.service} className={selectClass}>
              <option value="">{copy.all}</option>
              {services.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {locale === "th" ? service.nameTh : service.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {copy.area}
            <select name="area" defaultValue={query.area} className={selectClass}>
              <option value="">{copy.all}</option>
              <option value="bangkok">{copy.bangkok}</option>
              <option value="other">{copy.otherProvinces}</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {copy.status}
            <select name="status" defaultValue={query.status} className={selectClass}>
              <option value="">{copy.all}</option>
              {Object.entries(copy.statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-3 xl:col-span-6">
            <label className="text-xs font-medium text-muted-foreground">
              {copy.sort}
              <select name="sort" defaultValue={query.sort} className={selectClass}>
                <option value="updated">{copy.sortUpdated}</option>
                <option value="verified">{copy.sortVerified}</option>
                <option value="name">{copy.sortName}</option>
              </select>
            </label>
            <button className="h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white">{copy.search}</button>
            <Link href="/directory" className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-siam-blue">
              {copy.clear}
            </Link>
          </div>
        </div>
      </form>

      <div className="mt-4 flex gap-2 text-sm">
        {(["list", "grid", "map"] as const).map((item) => (
          <Link
            key={item}
            href={{ pathname: "/directory", query: { ...queryRecord, view: item === "list" ? undefined : item } }}
            className={`rounded-full px-3 py-1 ${view === item ? "bg-siam-blue text-white" : "bg-white ring-1 ring-border"}`}
          >
            {copy[item]}
          </Link>
        ))}
      </div>

      {showDashboard ? (
        <div className="mt-8 space-y-8">
          <p className="text-sm text-muted-foreground">{copy.starterNote}</p>
          {access.userId ? null : <p className="text-sm text-muted-foreground">{copy.signInToSave}</p>}
          <section>
            <h2 className="text-lg font-semibold">{copy.browseCategory}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/directory?browse=1" className="rounded-full bg-siam-blue px-3 py-2 text-sm font-semibold text-white">
                {copy.all}
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/directory?category=${category.slug}`}
                  className="rounded-full bg-white px-3 py-2 text-sm ring-1 ring-border"
                >
                  {locale === "th" ? category.nameTh : category.nameEn}
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">{copy.browseProvince}</h2>
            <div className="mt-3 space-y-4">
              {provincesByRegion().map((group) => (
                <div key={group.region}>
                  <h3 className="text-sm font-medium text-muted-foreground">{copy.regions[group.region]}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.provinces.map((province) => (
                      <Link
                        key={province.code}
                        href={`/directory?province=${province.code}`}
                        className="rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-border"
                      >
                        {locale === "th" ? province.nameTh : province.nameEn}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {access.userId ? (
            <>
              <OfficeRow title={copy.favorites} offices={favorites} copy={copy} locale={locale} empty={copy.emptyFavorites} signedIn />
              <OfficeRow title={copy.recent} offices={recent} copy={copy} locale={locale} empty={copy.emptyRecent} signedIn />
            </>
          ) : null}
          <OfficeRow title={copy.updated} offices={updated} copy={copy} locale={locale} signedIn={Boolean(access.userId)} />
        </div>
      ) : (
        <section className="mt-6">
          {result ? (
            <p className="mb-3 text-sm text-muted-foreground">{fill(copy.results, { count: result.total })}</p>
          ) : null}
          {view === "map" ? (
            <div className="space-y-3">
              <h2 className="font-semibold">{copy.mapTitle}</h2>
              {!query.province && !query.q && !query.category && !query.service ? (
                <p className="text-sm text-muted-foreground">{copy.mapNeedFilter}</p>
              ) : mapPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.mapEmpty}</p>
              ) : (
                <OfficeMap
                  points={mapPoints.flatMap((office) =>
                    office.latitude == null || office.longitude == null
                      ? []
                      : [
                          {
                            id: office.id,
                            href: `/${locale}/directory/${office.slug}`,
                            label: (locale === "th" ? office.nameTh || office.nameEn : office.nameEn || office.nameTh) || office.slug,
                            latitude: office.latitude,
                            longitude: office.longitude,
                          },
                        ]
                  )}
                />
              )}
            </div>
          ) : offices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8">
              <h2 className="text-lg font-semibold">{copy.noResults}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy.noResultsHint}</p>
            </div>
          ) : (
            <div className={view === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
              {offices.map((office) => (
                <div key={office.id}>
                  <OfficeCard
                    copy={copy}
                    locale={locale}
                    office={office}
                    favorited={favoriteIds.has(office.id)}
                    signedIn={Boolean(access.userId)}
                  />
                  {isVerificationStale({
                    verificationStatus: office.verificationStatus,
                    lastVerifiedAt: office.lastVerifiedAt,
                    archivedAt: office.archivedAt,
                    reminderDays: result?.reminderDays ?? 90,
                  }) ? (
                    <p className="mt-1 text-xs text-amber-800">{copy.stale}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {result && result.pageCount > 1 ? (
            <div className="mt-6 flex items-center justify-between text-sm">
              <p>{fill(copy.page, { page: result.page, pages: result.pageCount })}</p>
              <div className="flex gap-3">
                {result.page > 1 ? (
                  <Link href={{ pathname: "/directory", query: { ...queryRecord, page: String(result.page - 1) } }}>
                    {copy.prev}
                  </Link>
                ) : null}
                {result.page < result.pageCount ? (
                  <Link href={{ pathname: "/directory", query: { ...queryRecord, page: String(result.page + 1) } }}>
                    {copy.next}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

function OfficeRow({
  title,
  offices,
  copy,
  locale,
  empty,
  signedIn,
}: {
  title: string;
  offices: Parameters<typeof OfficeCard>[0]["office"][];
  copy: DirectoryCopy;
  locale: string;
  empty?: string;
  signedIn?: boolean;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {offices.length === 0 && empty ? <p className="mt-2 text-sm text-muted-foreground">{empty}</p> : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {offices.map((office) => (
          <OfficeCard key={office.id} copy={copy} locale={locale} office={office} signedIn={signedIn} />
        ))}
      </div>
    </section>
  );
}
