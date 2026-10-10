import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OfficeActions } from "@/components/directory/OfficeActions";
import { OfficeMap } from "@/components/directory/OfficeMap";
import { StatusBadge } from "@/components/directory/StatusBadge";
import { CorrectionForm, ReportForm } from "@/components/directory/ContributeForms";
import { toggleFavorite } from "@/actions/directory";
import {
  favoriteIdSet,
  getDirectoryOffice,
  recordOfficeView,
  resolveDirectoryAccess,
} from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";
import { parseHoursJson } from "@/lib/directory/hours";
import { WEEKDAYS } from "@/lib/directory/hours";
import { hasMapCoordinates } from "@/lib/directory/maps";
import { officeActions } from "@/lib/directory/phone";
import { provinceLabel } from "@/lib/directory/provinces";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ officeId: string }>;
}): Promise<Metadata> {
  const { officeId } = await params;
  const locale = await getLocale();
  const office = await getDirectoryOffice(officeId);
  if (!office) return { title: "Office" };
  const title = locale === "th" ? office.nameTh || office.nameEn : office.nameEn || office.nameTh;
  const province = provinceLabel(office.provinceCode, locale);
  return {
    title: title || "Office",
    description: [title, province].filter(Boolean).join(", "),
  };
}

export default async function OfficeDetailPage({
  params,
}: {
  params: Promise<{ officeId: string }>;
}) {
  const { officeId } = await params;
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);
  const access = await resolveDirectoryAccess();
  const office = await getDirectoryOffice(officeId);
  if (!office) notFound();
  const staffView = access.canContribute || access.canManage;
  let favorited = false;
  if (access.userId) {
    await Promise.all([
      recordOfficeView(access.userId, office.id),
      favoriteIdSet(access.userId, [office.id]).then((ids) => {
        favorited = ids.has(office.id);
      }),
    ]);
  }
  const province = provinceLabel(office.provinceCode, locale);
  const title = locale === "th" ? office.nameTh || office.nameEn : office.nameEn || office.nameTh;
  const alt = locale === "th" ? office.nameEn : office.nameTh;
  const category = locale === "th" ? office.category.nameTh : office.category.nameEn;
  const actions = officeActions({
    ...office,
    provinceName: province,
  });
  const hours = parseHoursJson(office.hoursJson);
  const coords = hasMapCoordinates(office);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-10">
      <p className="text-sm text-muted-foreground">
        {category}
        {office.district ? ` · ${office.district}` : ""} · {province}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          {alt && alt !== title ? <p className="text-muted-foreground">{alt}</p> : null}
        </div>
        <StatusBadge status={office.verificationStatus} copy={copy} />
      </div>
      {office.archivedAt ? <p className="mt-2 text-sm font-medium text-rose-700">{copy.archived}</p> : null}

      <div className="mt-4">
        {access.userId ? (
          <form action={toggleFavorite}>
            <input type="hidden" name="officeId" value={office.id} />
            <button type="submit" className="min-h-11 text-sm font-semibold text-siam-blue">
              {favorited ? copy.savedFavorite : copy.saveFavorite}
            </button>
          </form>
        ) : (
          <Link
            href={{ pathname: "/login", query: { redirect: `/${locale}/directory/${office.slug}` } }}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-siam-blue"
          >
            {copy.signInToSave}
          </Link>
        )}
      </div>

      <div className="mt-4 hidden md:block">
        <OfficeActions copy={copy} shareTitle={title || copy.brand} {...actions} />
      </div>

      <section className="mt-6 space-y-2 rounded-2xl bg-white p-4 ring-1 ring-border dark:bg-slate-950">
        <h2 className="font-semibold">{copy.contact}</h2>
        <p>{office.phonePrimary || copy.noPhone}</p>
        {office.phones.length ? (
          <p className="text-sm text-muted-foreground">
            {copy.morePhones}: {office.phones.join(", ")}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-sm">{office.addressTh || office.addressEn || copy.noAddress}</p>
        {office.addressEn && office.addressTh ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{office.addressEn}</p> : null}
        {office.email ? <p className="text-sm">{office.email}</p> : null}
        {office.contactNotes ? <p className="text-sm text-muted-foreground">{office.contactNotes}</p> : null}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-border dark:bg-slate-950">
        <h2 className="font-semibold">{copy.hours}</h2>
        {hours ? (
          <ul className="mt-2 space-y-1 text-sm">
            {WEEKDAYS.map((day) => {
              const row = hours.days[day];
              if (!row) return null;
              return (
                <li key={day}>
                  {copy.days[day]}:{" "}
                  {row.closed ? copy.closedDays : `${row.open ?? ""}–${row.close ?? ""}`}
                  {row.breakStart ? ` (${row.breakStart}–${row.breakEnd})` : ""}
                </li>
              );
            })}
          </ul>
        ) : null}
        {office.openingHoursText ? <p className="mt-2 whitespace-pre-wrap text-sm">{office.openingHoursText}</p> : null}
        {!hours && !office.openingHoursText ? <p className="mt-2 text-sm text-muted-foreground">{copy.unknown}</p> : null}
        {office.operatingDays ? <p className="mt-2 text-sm">{copy.operatingDays}: {office.operatingDays}</p> : null}
        {office.lunchBreak ? <p className="text-sm">{copy.lunch}: {office.lunchBreak}</p> : null}
        {office.holidayNotes ? <p className="mt-2 whitespace-pre-wrap text-sm">{office.holidayNotes}</p> : null}
        <p className="mt-2 text-sm">
          {copy.appointmentRequired}: {boolLabel(office.appointmentRequired, copy)}
        </p>
        <p className="text-sm">
          {copy.walkIns}: {boolLabel(office.walkInsAccepted, copy)}
        </p>
        {office.appointmentNotes ? <p className="mt-2 whitespace-pre-wrap text-sm">{office.appointmentNotes}</p> : null}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-border dark:bg-slate-950">
        <h2 className="font-semibold">{copy.services}</h2>
        {office.services.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{copy.unknown}</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {office.services.map((link) => (
              <li key={link.service.slug}>
                {locale === "th" ? link.service.nameTh : link.service.nameEn}
                {link.notes ? ` — ${link.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
        {office.serviceNotes ? <p className="mt-3 whitespace-pre-wrap text-sm">{office.serviceNotes}</p> : null}
        {office.documentsRequired ? (
          <>
            <h3 className="mt-4 text-sm font-semibold">{copy.documents}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{office.documentsRequired}</p>
          </>
        ) : null}
        {office.bookingInfo ? (
          <>
            <h3 className="mt-4 text-sm font-semibold">{copy.booking}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{office.bookingInfo}</p>
          </>
        ) : null}
        {office.governmentLinks ? <p className="mt-3 whitespace-pre-wrap text-sm">{office.governmentLinks}</p> : null}
      </section>

      {office.parkingNotes || office.counterNotes ? (
        <section className="mt-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-border dark:bg-slate-950">
          <Note label={copy.parking} text={office.parkingNotes} />
          <Note label={copy.counter} text={office.counterNotes} />
        </section>
      ) : null}

      {staffView ? (
        <section className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold">{copy.internal}</h2>
          <Note label={copy.internal} text={office.internalNotes} />
          <Note label={copy.procedure} text={office.proceduralNotes} />
          <Note label={copy.tips} text={office.staffTips} />
          {!office.internalNotes && !office.proceduralNotes && !office.staffTips ? (
            <p className="mt-2 text-muted-foreground">{copy.unknown}</p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-border dark:bg-slate-950">
        <h2 className="font-semibold">{copy.mapTitle}</h2>
        {coords && office.latitude != null && office.longitude != null ? (
          <div className="mt-3">
            <OfficeMap
              height={240}
              points={[
                {
                  id: office.id,
                  href: `/${locale}/directory/${office.slug}`,
                  label: title || office.slug,
                  latitude: office.latitude,
                  longitude: office.longitude,
                },
              ]}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{copy.noCoordinates}</p>
        )}
      </section>

      <section className="mt-4 text-sm text-muted-foreground">
        <p>
          {copy.verifiedOn}:{" "}
          {office.lastVerifiedAt ? office.lastVerifiedAt.toISOString().slice(0, 10) : copy.notVerified}
          {staffView && office.lastVerifiedBy?.name ? ` · ${office.lastVerifiedBy.name}` : ""}
        </p>
        {staffView && office.lastVerificationMethod ? <p>{office.lastVerificationMethod}</p> : null}
        {office.sourceUrl ? (
          <p>
            {copy.source}:{" "}
            <a className="text-siam-blue" href={office.sourceUrl}>
              {office.sourceUrl}
            </a>
          </p>
        ) : null}
        {office.sourceNotes ? <p className="mt-1 whitespace-pre-wrap">{office.sourceNotes}</p> : null}
        {staffView && office.reliabilityNotes ? <p className="mt-1 whitespace-pre-wrap">{office.reliabilityNotes}</p> : null}
      </section>

      {access.canContribute ? (
        <div className="mt-6 grid gap-4">
          <ReportForm copy={copy} officeId={office.id} />
          <CorrectionForm copy={copy} officeId={office.id} />
        </div>
      ) : null}

      <div className="md:hidden">
        <OfficeActions copy={copy} shareTitle={title || copy.brand} {...actions} />
      </div>
    </main>
  );
}

function boolLabel(value: boolean | null, copy: ReturnType<typeof getDirectoryCopy>) {
  if (value === true) return copy.yes;
  if (value === false) return copy.no;
  return copy.unknown;
}

function Note({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-3">
      <h3 className="font-medium">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
