"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, BadgeCheck, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PublicFreelancerCard } from "@/data-access/freelancer";

function initials(name: string | null) {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function FreelancerDirectoryClient({
  initialItems,
  initialTotal,
  initialQ,
  initialSkill,
}: {
  initialItems: PublicFreelancerCard[];
  initialTotal: number;
  initialQ: string;
  initialSkill: string;
}) {
  const t = useTranslations("freelancersPublic");
  const [q, setQ] = useState(initialQ);
  const [skill, setSkill] = useState(initialSkill);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const skillSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      for (const s of item.skills) set.add(s);
    }
    return Array.from(set).slice(0, 12);
  }, [items]);

  function runSearch(nextQ = q, nextSkill = skill) {
    setError(null);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextSkill.trim()) params.set("skill", nextSkill.trim());
      params.set("pageSize", "24");
      try {
        const res = await fetch(`/api/freelancers?${params.toString()}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error ?? t("loadError"));
          return;
        }
        setItems(json.data.items);
        setTotal(json.data.total);
      } catch {
        setError(t("loadError"));
      }
    });
  }

  return (
    <div>
      <form
        className="mb-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            aria-label={t("searchPlaceholder")}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t("searching") : t("search")}
        </Button>
      </form>

      {skillSuggestions.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSkill("");
              runSearch(q, "");
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !skill
                ? "bg-siam-blue text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {t("allSkills")}
          </button>
          {skillSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSkill(s);
                runSearch(q, s);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                skill === s
                  ? "bg-siam-blue text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {t("resultsCount", { count: total })}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((freelancer) => (
            <Link
              key={freelancer.id}
              href={`/freelancers/${freelancer.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-siam-blue/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-siam-blue/10">
                  {freelancer.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={freelancer.user.image}
                      alt={freelancer.user.name ?? freelancer.slug}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-siam-blue">
                      {initials(freelancer.user.name)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-base font-semibold text-gray-900 group-hover:text-siam-blue dark:text-white">
                      {freelancer.user.name ?? freelancer.slug}
                    </h2>
                    {freelancer.verificationStatus === "verified" && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-siam-blue" aria-label={t("verified")} />
                    )}
                  </div>
                  {freelancer.title && (
                    <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
                      {freelancer.title}
                    </p>
                  )}
                  {freelancer.totalReviews > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {freelancer.averageRating.toFixed(1)} · {freelancer.totalReviews}
                    </p>
                  )}
                </div>
              </div>
              {freelancer.bio && (
                <p className="mb-3 line-clamp-3 flex-1 text-sm text-gray-600 dark:text-gray-400">
                  {freelancer.bio}
                </p>
              )}
              {freelancer.skills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {freelancer.skills.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-siam-blue/10 px-2 py-0.5 text-xs text-siam-blue"
                    >
                      {s}
                    </span>
                  ))}
                  {freelancer.skills.length > 4 && (
                    <span className="text-xs text-gray-500">+{freelancer.skills.length - 4}</span>
                  )}
                </div>
              )}
              {freelancer.hourlyRate != null && (
                <p className="mt-auto text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(freelancer.hourlyRate)}
                  <span className="font-normal text-gray-500"> / hr</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
