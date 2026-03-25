import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Building2, Wallet, CalendarDays, BookOpen } from "lucide-react";
import { site } from "@/config/site";

type Row = { name: string; price: string };
type Resource = { title: string; body: string };

export async function DriverLicenseExtras() {
  const t = await getTranslations("driverLicensePage");
  const trustPoints = t.raw("trustPoints") as string[];
  const packageRows = t.raw("packageRows") as Row[];
  const addonRows = t.raw("addonRows") as Row[];
  const resources = t.raw("resources") as Resource[];

  return (
    <div className="mt-12 space-y-10 border-t border-gray-200 pt-10 dark:border-gray-700">
      <section>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("trustTitle")}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("trustLead")}</p>
        <ul className="mt-4 space-y-3">
          {trustPoints.map((line, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-gray-700 dark:text-gray-300">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-siam-blue" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("packagesTitle")}</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t("packagesIntro")}</p>
            <ul className="space-y-3">
              {packageRows.map((row, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-0.5 border-b border-gray-200 pb-3 last:border-0 dark:border-gray-600 sm:flex-row sm:justify-between sm:gap-4"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{row.name}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 sm:text-right">{row.price}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-siam-blue" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("addonsTitle")}</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t("addonsIntro")}</p>
            <ul className="space-y-3">
              {addonRows.map((row, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-0.5 border-b border-gray-200 pb-3 last:border-0 dark:border-gray-600 sm:flex-row sm:justify-between sm:gap-4"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{row.name}</span>
                  <span className="text-siam-blue dark:text-siam-blue-light sm:text-right">{row.price}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card className="border-0 bg-amber-50/80 shadow-sm dark:bg-amber-950/20">
        <CardContent className="flex gap-4 p-6">
          <CalendarDays className="h-6 w-6 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{t("schedulingTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{t("schedulingBody")}</p>
          </div>
        </CardContent>
      </Card>

      <section>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("paymentTitle")}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("paymentBody")}</p>
        <Card className="mt-4 border border-gray-200 dark:border-gray-700">
          <CardContent className="space-y-3 p-6 text-sm">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{t("bankLabel")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t("accountNameLabel")}: </span>
                <span className="text-gray-900 dark:text-gray-100">{t("accountName")}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t("accountNumberLabel")}: </span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{t("accountNumber")}</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{t("promptPayNote")}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-siam-blue" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("resourcesTitle")}</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((item, i) => (
            <Card key={i} className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
              <CardContent className="p-5">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h4>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button asChild className="mt-6 bg-siam-blue hover:bg-siam-blue-light" size="lg">
          <Link href="/book/driver-license">{t("resourcesCta")}</Link>
        </Button>
      </section>

      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t("disclaimer")}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("bookingEmailNote", { email: site.email })}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("legacyWizardIntro")}{" "}
        <a
          href="https://siam-ez.com/thailicense.html"
          className="text-siam-blue underline hover:no-underline dark:text-siam-blue-light"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("legacyWizardLinkText")}
        </a>{" "}
        {t("legacyWizardOutro")}
      </p>
    </div>
  );
}
