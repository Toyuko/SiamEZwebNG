import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PackageId = "basic" | "full" | "premium";

export async function MarriageRegistrationSections() {
  const t = await getTranslations("services");

  const basicFeatures = t.raw("marriageRegistration.basicFeatures") as string[];
  const fullFeatures = t.raw("marriageRegistration.fullFeatures") as string[];
  const premiumFeatures = t.raw("marriageRegistration.premiumFeatures") as string[];

  const faqItems = t.raw("marriageRegistration.faqItems") as Array<{ q: string; a: string }>;

  const mt = (key: string) => t(`marriageRegistration.${key}`);

  const packages: Array<{
    id: PackageId;
    titleKey: "packageBasicTitle" | "packageFullTitle" | "packagePremiumTitle";
    priceKey: "packageBasicPrice" | "packageFullPrice" | "packagePremiumPrice";
    features: string[];
    ctaKey: "getStarted" | "startApplication" | "inquireNow";
    popular?: boolean;
  }> = [
    {
      id: "basic",
      titleKey: "packageBasicTitle",
      priceKey: "packageBasicPrice",
      features: basicFeatures,
      ctaKey: "getStarted",
    },
    {
      id: "full",
      titleKey: "packageFullTitle",
      priceKey: "packageFullPrice",
      features: fullFeatures,
      ctaKey: "startApplication",
      popular: true,
    },
    {
      id: "premium",
      titleKey: "packagePremiumTitle",
      priceKey: "packagePremiumPrice",
      features: premiumFeatures,
      ctaKey: "inquireNow",
    },
  ];

  return (
    <div className="mt-12 space-y-16 border-t border-gray-200 pt-12 dark:border-gray-700">
      <section aria-labelledby="marriage-packages-heading">
        <h2
          id="marriage-packages-heading"
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
        >
          {mt("packagesTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-base text-gray-600 dark:text-gray-400">
          {mt("packagesIntro")}
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(
                "relative flex flex-col border-0 shadow-md dark:bg-gray-800/50",
                pkg.popular && "ring-2 ring-siam-blue lg:scale-[1.02]"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-siam-blue px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {mt("popular")}
                  </span>
                </div>
              )}
              <CardContent className="flex flex-1 flex-col p-6 pt-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {mt(pkg.titleKey)}
                </h3>
                <p className="mt-2 text-2xl font-bold text-siam-blue dark:text-siam-blue-light">
                  {mt(pkg.priceKey)}{" "}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {mt("plusFees")}
                  </span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  {pkg.features.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-0.5 text-siam-blue" aria-hidden>
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={cn(
                    "mt-6 w-full",
                    pkg.popular
                      ? "bg-siam-blue text-white hover:bg-siam-blue-light"
                      : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  )}
                  variant={pkg.popular ? "default" : "outline"}
                  size="lg"
                >
                  <Link href={pkg.id === "premium" ? "/contact" : "/book/marriage-registration"}>
                    {mt(pkg.ctaKey)}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="marriage-faq-heading">
        <h2
          id="marriage-faq-heading"
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
        >
          {mt("faqTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-base text-gray-600 dark:text-gray-400">
          {mt("faqIntro")}
        </p>
        <div className="mt-8 space-y-3">
          {faqItems.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40"
            >
              <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-gray-900 dark:text-gray-100 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {item.q}
                  <span className="text-siam-blue transition group-open:rotate-180">▼</span>
                </span>
              </summary>
              <div className="border-t border-gray-200 px-4 pb-4 pt-2 text-sm leading-relaxed text-gray-600 dark:border-gray-600 dark:text-gray-400">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">{mt("independentNotice")}</p>
    </div>
  );
}
