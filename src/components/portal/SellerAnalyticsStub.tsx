import { Link } from "@/i18n/navigation";
import { BarChart3 } from "lucide-react";

export type SellerAnalyticsRow = {
  listingId: string;
  listingType: "vehicle" | "property";
  title: string;
  href: string;
  viewCount: number;
};

function listingEditHref(row: SellerAnalyticsRow) {
  return row.listingType === "vehicle"
    ? `/portal/sales?edit=${row.listingId}`
    : `/portal/real-estate?edit=${row.listingId}`;
}

export function SellerAnalyticsStub({
  title,
  subtitle,
  emptyLabel,
  viewsLabel,
  manageSalesLabel,
  manageRealEstateLabel,
  editListingLabel,
  totalViews,
  rows,
}: {
  title: string;
  subtitle: string;
  emptyLabel: string;
  viewsLabel: (count: number) => string;
  manageSalesLabel: string;
  manageRealEstateLabel: string;
  editListingLabel: string;
  totalViews: number;
  rows: SellerAnalyticsRow[];
}) {
  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-siam-blue/10">
            <BarChart3 className="h-5 w-5 text-siam-blue" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-siam-blue dark:text-siam-blue-light">
          {viewsLabel(totalViews)}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row) => (
            <li
              key={`${row.listingType}:${row.listingId}`}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <Link
                href={row.href}
                className="min-w-0 truncate text-sm text-gray-900 hover:text-siam-blue hover:underline dark:text-gray-100 dark:hover:text-siam-blue-light"
              >
                {row.title}
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  {viewsLabel(row.viewCount)}
                </span>
                <Link
                  href={listingEditHref(row)}
                  className="text-xs font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
                >
                  {editListingLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/portal/sales"
          className="font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
        >
          {manageSalesLabel}
        </Link>
        <Link
          href="/portal/real-estate"
          className="font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
        >
          {manageRealEstateLabel}
        </Link>
      </div>
    </section>
  );
}
