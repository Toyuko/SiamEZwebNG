import { Link } from "@/i18n/navigation";
import { ArrowRight, IdCard } from "lucide-react";
import { prisma } from "@/lib/db";
import { serviceTitle } from "@/lib/licence-verification/copy";

type LicenceRow = {
  id: string;
  referenceNumber: string;
  status: string;
  serviceKind: Parameters<typeof serviceTitle>[0];
  accessToken: string;
};

/**
 * Compact driving-licence pre-check promo / status card for the customer dashboard.
 */
export async function PreCheckCard({
  userId,
  locale,
  labels,
  hideWhenActiveLicenseBooking = false,
}: {
  userId: string;
  locale: string;
  labels: {
    title: string;
    titleWithStatus: string;
    description: string;
    startCta: string;
    viewCta: string;
    newCheckCta: string;
  };
  /** When true, skip the promo if the customer already has an active DL booking elsewhere. */
  hideWhenActiveLicenseBooking?: boolean;
}) {
  if (hideWhenActiveLicenseBooking) return null;

  let rows: LicenceRow[] = [];
  try {
    rows = await prisma.licenceApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        serviceKind: true,
        accessToken: true,
      },
    });
  } catch {
    return null;
  }

  const latest = rows[0];
  const lang = locale === "th" ? "th" : "en";

  return (
    <section className="mb-6 rounded-2xl border border-siam-blue/20 bg-gradient-to-br from-white to-[#F4F8FF] p-4 shadow-soft dark:border-siam-blue/30 dark:from-gray-900 dark:to-gray-900 sm:p-5">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
          <IdCard className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-siam-ink dark:text-white">
            {latest ? labels.titleWithStatus : labels.title}
          </h2>
          <p className="mt-1 text-sm text-siam-ink-muted dark:text-gray-400">
            {labels.description}
          </p>

          {latest ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <Link
                    href={`/driving-licence/track/${row.accessToken}`}
                    className="font-semibold text-siam-blue hover:underline"
                  >
                    {row.referenceNumber}
                  </Link>
                  <span className="text-siam-ink-muted dark:text-gray-500">
                    {serviceTitle(row.serviceKind, lang)} ·{" "}
                    {row.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            href={
              latest
                ? `/driving-licence/track/${latest.accessToken}`
                : "/driving-licence/apply"
            }
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-siam-blue hover:underline"
          >
            {latest ? labels.viewCta : labels.startCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {latest ? (
            <Link
              href="/driving-licence/apply"
              className="ml-4 inline-flex items-center gap-1 text-sm font-medium text-siam-ink-muted hover:text-siam-blue dark:text-gray-400"
            >
              {labels.newCheckCta}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
