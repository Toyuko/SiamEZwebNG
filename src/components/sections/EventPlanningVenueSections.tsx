import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram } from "lucide-react";

export async function EventPlanningVenueSections({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "eventPlanningVenuePage" });

  return (
    <div className="space-y-12 border-t border-gray-200 pt-10 dark:border-gray-700">
      <section aria-labelledby="event-collaboration-heading">
        <h2
          id="event-collaboration-heading"
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
        >
          {t("collaborationTitle")}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
          {t("collaborationBody")}
        </p>
        <p className="mt-6 rounded-xl border border-siam-blue/20 bg-siam-blue/5 px-5 py-4 text-center text-sm font-semibold text-siam-blue dark:border-siam-blue/30 dark:bg-siam-blue/10 dark:text-siam-blue-light">
          {t("collaborationTagline")}
        </p>
      </section>

      <section aria-labelledby="event-venue-heading">
        <h2
          id="event-venue-heading"
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
        >
          {t("venueTitle")}
        </h2>
        <Card className="mt-6 border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <p className="whitespace-pre-line text-base leading-relaxed text-gray-700 dark:text-gray-300">
              {t("venueBody")}
            </p>
            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={t("instagramUrl")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
              >
                <Instagram className="h-5 w-5 shrink-0" aria-hidden />
                <span>
                  {t("instagramCta")} {t("instagramHandle")}
                </span>
              </a>
              <Button asChild variant="default" className="w-full sm:w-auto">
                <Link href="/contact">{t("inquireCta")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("footerTagline")}</p>
    </div>
  );
}
