import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { HomeConciergeCta } from "@/components/sections/HomeConciergeCta";
import {
  HomeGoalPrompts,
  type HomeGoalPrompt,
} from "@/components/sections/HomeGoalPrompts";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";
import { ArrowRight, MapPin, Route } from "lucide-react";

export type HomeLifeEventTeaser = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  stepCount: number;
};

export type HomeFeaturedListing = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string | null;
  kind: "vehicle" | "property";
};

export type HomeGoalsSectionLabels = {
  title: string;
  subtitle: string;
  popularGoals: string;
  lifeEvents: string;
  marketplace: string;
  viewAllGoals: string;
  viewJourney: string;
  viewAllVehicles: string;
  viewAllProperties: string;
  conciergeLabel: string;
  conciergeHint: string;
  conciergePrompt: string;
  stepsLabel: string;
};

type Props = {
  labels: HomeGoalsSectionLabels;
  popularGoals: HomeGoalPrompt[];
  lifeEvents: HomeLifeEventTeaser[];
  featuredListings: HomeFeaturedListing[];
  isLoggedIn: boolean;
  goalsHref: string;
};

export function HomeGoalsSection({
  labels,
  popularGoals,
  lifeEvents,
  featuredListings,
  isLoggedIn,
  goalsHref,
}: Props) {
  const vehicles = featuredListings.filter((l) => l.kind === "vehicle").slice(0, 3);
  const properties = featuredListings.filter((l) => l.kind === "property").slice(0, 3);
  const hasMarketplace = vehicles.length > 0 || properties.length > 0;

  return (
    <section
      id="home-goals"
      className="scroll-mt-20 border-b border-gray-200 bg-gray-50/80 py-12 dark:border-gray-800 dark:bg-gray-950/50 sm:py-16"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {labels.title}
          </h2>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
            {labels.subtitle}
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {labels.popularGoals}
              </h3>
              <Link
                href={goalsHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-siam-blue hover:underline"
              >
                {labels.viewAllGoals}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <HomeGoalPrompts prompts={popularGoals} />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {labels.lifeEvents}
            </h3>
            {lifeEvents.length > 0 ? (
              <ul className="space-y-3">
                {lifeEvents.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={
                        isLoggedIn
                          ? `/portal/goals?event=${encodeURIComponent(event.key)}`
                          : `/login?redirect=${encodeURIComponent(`/portal/goals?event=${event.key}`)}`
                      }
                      className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-siam-blue/30 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-siam-yellow/15 text-siam-blue">
                        <Route className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 group-hover:text-siam-blue dark:text-white">
                          {event.title}
                        </p>
                        {event.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                            {event.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-gray-500">
                          {event.stepCount} {labels.stepsLabel}
                        </p>
                      </div>
                      <span className="self-center text-sm font-medium text-siam-blue opacity-0 transition group-hover:opacity-100">
                        {labels.viewJourney}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700">
                {labels.viewAllGoals}
              </p>
            )}
          </div>
        </div>

        {hasMarketplace ? (
          <div className="mt-10 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {labels.marketplace}
            </h3>
            <div className="grid gap-6 lg:grid-cols-2">
              {vehicles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {labels.viewAllVehicles}
                    </p>
                    <Link
                      href="/sales"
                      className="text-xs font-medium text-siam-blue hover:underline"
                    >
                      {labels.viewAllVehicles}
                    </Link>
                  </div>
                  <ul className="flex gap-3 overflow-x-auto pb-1">
                    {vehicles.map((item) => (
                      <li key={item.id} className="w-44 shrink-0">
                        <FeaturedListingCard item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {properties.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {labels.viewAllProperties}
                    </p>
                    <Link
                      href="/real-estate"
                      className="text-xs font-medium text-siam-blue hover:underline"
                    >
                      {labels.viewAllProperties}
                    </Link>
                  </div>
                  <ul className="flex gap-3 overflow-x-auto pb-1">
                    {properties.map((item) => (
                      <li key={item.id} className="w-44 shrink-0">
                        <FeaturedListingCard item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-10">
          <HomeConciergeCta
            label={labels.conciergeLabel}
            hint={labels.conciergeHint}
            prompt={labels.conciergePrompt}
          />
        </div>
      </div>
    </section>
  );
}

function FeaturedListingCard({ item }: { item: HomeFeaturedListing }) {
  return (
    <Link
      href={item.href}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-siam-blue/30 dark:border-gray-800 dark:bg-gray-950"
    >
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-900">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            sizes="176px"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <MapPin className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {item.title}
        </p>
        <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
      </div>
    </Link>
  );
}

/** Map boosted vehicle rows to homepage featured cards. */
export function mapFeaturedVehicle(
  v: {
    id: string;
    title: string;
    make: string;
    model: string;
    year: number;
    priceAmount: number;
    priceCurrency: string;
    heroImageUrl: string;
  }
): HomeFeaturedListing {
  return {
    id: v.id,
    title: v.title,
    subtitle: `${v.year} · ${v.priceAmount.toLocaleString()} ${v.priceCurrency}`,
    href: buildSalesListingPath(v.id),
    imageUrl: v.heroImageUrl || null,
    kind: "vehicle",
  };
}

/** Map boosted property rows to homepage featured cards. */
export function mapFeaturedProperty(
  p: {
    id: string;
    title: string;
    priceAmount: number;
    priceCurrency: string;
    province: string | null;
    heroImageUrl: string;
  }
): HomeFeaturedListing {
  return {
    id: p.id,
    title: p.title,
    subtitle: `${p.priceAmount.toLocaleString()} ${p.priceCurrency}${p.province ? ` · ${p.province}` : ""}`,
    href: buildRealEstateListingPath(p.id),
    imageUrl: p.heroImageUrl || null,
    kind: "property",
  };
}
