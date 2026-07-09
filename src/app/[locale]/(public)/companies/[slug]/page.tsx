import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, ExternalLink, MapPin } from "lucide-react";
import { getPublicCompanyProfileBySlug } from "@/data-access/company";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ApplyToJobButton } from "@/components/company/ApplyToJobButton";

export const dynamic = "force-dynamic";

function formatThb(satang: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(satang / 100);
}

export default async function PublicCompanyProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("company");

  const company = await getPublicCompanyProfileBySlug(slug);
  if (!company) {
    notFound();
  }

  const session = await getSession();
  const isFreelancer = session?.user.role === "freelancer";

  let appliedJobIds = new Set<string>();
  if (isFreelancer && session) {
    const apps = await prisma.jobApplication.findMany({
      where: {
        freelancerId: session.user.id,
        jobPostingId: { in: company.jobPostings.map((j) => j.id) },
      },
      select: { jobPostingId: true },
    });
    appliedJobIds = new Set(apps.map((a) => a.jobPostingId));
  }

  const descriptionParagraphs = (company.description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="relative">
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-siam-blue to-[#1a3569] md:h-64">
          {company.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.bannerImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md dark:border-gray-900 sm:h-28 sm:w-28">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo}
                  alt={company.companyName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-siam-blue/10 text-2xl font-bold text-siam-blue">
                  {company.companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {company.companyName}
                </h1>
                {company.isVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <BadgeCheck className="h-4 w-4" />
                    {t("verifiedBusiness")}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                {company.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {company.address}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-siam-blue hover:underline"
                  >
                    {t("visitWebsite")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("about")}</h2>
          <div className="mt-3 space-y-3 text-gray-700 dark:text-gray-300">
            {descriptionParagraphs.length > 0 ? (
              descriptionParagraphs.map((p) => <p key={p.slice(0, 40)}>{p}</p>)
            ) : (
              <p className="text-gray-500">—</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {company.industry && (
              <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-gray-900">
                {company.industry}
              </span>
            )}
            {company.companySize && (
              <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-gray-900">
                {company.companySize}
              </span>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("activeOpenings")}
          </h2>
          {company.jobPostings.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">{t("noOpenings")}</p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {company.jobPostings.map((job) => (
                <li key={job.id}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm font-medium text-siam-blue">
                            {t("budgetLabel")}: {formatThb(job.budget)}
                          </p>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                            {job.description}
                          </p>
                          {job.requiredSkills.length > 0 && (
                            <div className="mt-3">
                              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                                {t("skillsLabel")}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {job.requiredSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-md bg-siam-blue/10 px-2 py-1 text-xs text-siam-blue"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="sm:w-56">
                          <ApplyToJobButton
                            jobPostingId={job.id}
                            isFreelancer={!!isFreelancer}
                            isLoggedIn={!!session}
                            alreadyApplied={appliedJobIds.has(job.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("trustReviews")}
          </h2>
          <Card className="mt-4">
            <CardContent className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("trustPlaceholder")}</p>
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                {t("completedJobs")}: {company._count.jobPostings}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
