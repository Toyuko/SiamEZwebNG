"use client";

import { useState } from "react";
import { BadgeCheck, Mail, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { FreelancerInquiryModal } from "./FreelancerInquiryModal";
import type { FreelancerServiceOffering } from "@/lib/freelancer-profile";

type ProfileView = {
  slug: string;
  title: string | null;
  bio: string | null;
  skills: string[];
  hourlyRate: number | null;
  averageRating: number;
  totalReviews: number;
  verificationStatus: string;
  isSpecialMember: boolean;
  services: FreelancerServiceOffering[];
  user: { name: string | null; image: string | null };
};

function initials(name: string | null) {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function FreelancerPublicProfileClient({ profile }: { profile: ProfileView }) {
  const t = useTranslations("freelancersPublic");
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const displayName = profile.user.name ?? profile.slug;

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-siam-blue/10 ring-4 ring-white dark:ring-gray-900">
              {profile.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.user.image}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-siam-blue">
                  {initials(profile.user.name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {displayName}
                </h1>
                {profile.verificationStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-siam-blue/10 px-2.5 py-1 text-xs font-medium text-siam-blue">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t("verifiedVendor")}
                  </span>
                )}
                {profile.verificationStatus !== "verified" && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {t("freelancerBadge")}
                  </span>
                )}
              </div>
              {profile.title && (
                <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{profile.title}</p>
              )}
              {profile.totalReviews > 0 && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {profile.averageRating.toFixed(1)} ·{" "}
                  {t("reviewsCount", { count: profile.totalReviews })}
                </p>
              )}
            </div>
          </header>

          {profile.bio && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {t("about")}
              </h2>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-700 dark:text-gray-300">
                {profile.bio}
              </p>
            </section>
          )}

          {profile.skills.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {t("skills")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-siam-blue/10 px-3 py-1.5 text-sm font-medium text-siam-blue"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.services.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("servicesOffered")}
              </h2>
              <ul className="space-y-3">
                {profile.services.map((service, i) => (
                  <li
                    key={`${service.title}-${i}`}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{service.title}</h3>
                      {service.price != null && (
                        <span className="text-sm font-semibold text-siam-blue">
                          {formatCurrency(service.price, service.currency ?? "THB")}
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {service.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {profile.hourlyRate != null ? (
              <div className="mb-4">
                <p className="text-sm text-gray-500">{t("hourlyRate")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(profile.hourlyRate)}
                  <span className="text-base font-normal text-gray-500"> / hr</span>
                </p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t("rateOnRequest")}</p>
            )}
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={() => setInquiryOpen(true)}
            >
              <Mail className="h-4 w-4" />
              {t("contactCta")}
            </Button>
            <p className="mt-3 text-center text-xs text-gray-500">{t("contactHint")}</p>
          </div>
        </aside>
      </div>

      <FreelancerInquiryModal
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        slug={profile.slug}
        freelancerName={displayName}
      />
    </>
  );
}
