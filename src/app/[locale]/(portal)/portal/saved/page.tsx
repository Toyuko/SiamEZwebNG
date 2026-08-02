import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { buildUserOwner, MAX_COMPARE_ITEMS } from "@/lib/marketplace-engagement";
import {
  listCompareForHub,
  listRecentViewsForHub,
  listSavedListingsForHub,
  type HubListingCard,
} from "@/data-access/marketplace-engagement";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SavedHubActions } from "./SavedHubActions";
import { listSavedSearches } from "@/data-access/saved-searches";
import { SavedSearchDeleteButton } from "./SavedSearchDeleteButton";
import { isFeatureEnabled } from "@/lib/feature-flags";

function formatPrice(amount: number, currency: string, contactLabel: string) {
  if (amount <= 0) return contactLabel;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ListingGrid({
  items,
  empty,
  contactLabel,
  typeVehicle,
  typeProperty,
  openLabel,
  actionMode = "none",
}: {
  items: HubListingCard[];
  empty: string;
  contactLabel: string;
  typeVehicle: string;
  typeProperty: string;
  openLabel: string;
  actionMode?: "none" | "unsave" | "removeCompare";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">{empty}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={`${item.listingType}:${item.listingId}`}>
          <Card className="overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.heroImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <CardContent className="space-y-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {item.listingType === "vehicle" ? typeVehicle : typeProperty}
              </p>
              <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.title}
              </h3>
              {item.subtitle ? (
                <p className="text-xs text-gray-500">{item.subtitle}</p>
              ) : null}
              <p className="text-base font-bold text-siam-blue dark:text-siam-blue-light">
                {formatPrice(item.priceAmount, item.priceCurrency, contactLabel)}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline" className="border-siam-blue text-siam-blue">
                  <Link href={item.href}>{openLabel}</Link>
                </Button>
                {actionMode !== "none" ? (
                  <SavedHubActions
                    mode={actionMode}
                    listingType={item.listingType}
                    listingId={item.listingId}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default async function PortalSavedListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("marketplaceEngagement");
  const owner = buildUserOwner(session.user.id);

  const [saved, recent, compare, savedSearches, marketplaceBeta] = await Promise.all([
    listSavedListingsForHub(owner),
    listRecentViewsForHub(owner),
    listCompareForHub(owner),
    listSavedSearches(owner),
    isFeatureEnabled("marketplace_beta"),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("hubTitle")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("hubSubtitle")}</p>
      </header>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("compareSection")}
          </h2>
          <p className="text-sm text-gray-500">
            {t("compareCountLabel", { count: compare.length, max: MAX_COMPARE_ITEMS })}
          </p>
        </div>
        <ListingGrid
          items={compare}
          empty={t("compareEmpty")}
          contactLabel={t("priceContact")}
          typeVehicle={t("typeVehicle")}
          typeProperty={t("typeProperty")}
          openLabel={t("openListing")}
          actionMode="removeCompare"
        />
      </section>
      {marketplaceBeta ? <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Saved searches</h2>
        {savedSearches.length ? <ul className="divide-y rounded-lg border border-gray-200 dark:border-gray-800">{savedSearches.map((search) => {
          const query = new URLSearchParams(Object.entries(search.query as Record<string, string>)).toString();
          const href = `${search.listingType === "vehicle" ? "/sales" : "/real-estate"}${query ? `?${query}` : ""}`;
          return <li key={search.id} className="flex items-center justify-between gap-3 p-3"><Link className="text-sm font-medium text-siam-blue hover:underline" href={href}>{search.name}</Link><SavedSearchDeleteButton id={search.id} /></li>;
        })}</ul> : <p className="text-sm text-gray-600 dark:text-gray-400">Save a search from marketplace filters to find it here.</p>}
      </section> : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("savedSection")}
        </h2>
        <ListingGrid
          items={saved}
          empty={t("savedEmpty")}
          contactLabel={t("priceContact")}
          typeVehicle={t("typeVehicle")}
          typeProperty={t("typeProperty")}
          openLabel={t("openListing")}
          actionMode="unsave"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("recentSection")}
        </h2>
        <ListingGrid
          items={recent}
          empty={t("recentEmpty")}
          contactLabel={t("priceContact")}
          typeVehicle={t("typeVehicle")}
          typeProperty={t("typeProperty")}
          openLabel={t("openListing")}
          actionMode="none"
        />
      </section>
    </div>
  );
}
