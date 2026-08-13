import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Search } from "lucide-react";

export async function VehicleFinderCtas() {
  const t = await getTranslations("vehicleIntake");

  return (
    <div className="space-y-4 border-t border-gray-200 pt-10 dark:border-gray-700">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("servicePageFormsTitle")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("servicePageFormsBody")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-siam-blue text-white">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{t("buyTitle")}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400">{t("buyBlurb")}</p>
            <Button asChild className="mt-4 bg-siam-blue hover:bg-siam-blue-light" size="lg">
              <Link href="/vehicle/buy">{t("buyTitle")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-siam-blue text-white">
              <Car className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{t("sellTitle")}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400">{t("sellBlurb")}</p>
            <Button asChild className="mt-4 bg-siam-blue hover:bg-siam-blue-light" size="lg">
              <Link href="/vehicle/sell">{t("sellTitle")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
