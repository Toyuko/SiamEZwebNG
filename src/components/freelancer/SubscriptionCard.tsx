import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles } from "lucide-react";

export async function SubscriptionCard() {
  const t = await getTranslations("freelancer");

  return (
    <Card className="h-full border-2 border-siam-yellow/40 bg-gradient-to-br from-white to-siam-yellow/10 dark:from-gray-900 dark:to-siam-yellow/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-siam-blue-dark dark:text-siam-yellow">
          <Crown className="h-5 w-5 text-siam-yellow" />
          {t("subscriptionTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("subscriptionDescription")}</p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-siam-yellow" />
            {t("subscriptionBenefit1")}
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-siam-yellow" />
            {t("subscriptionBenefit2")}
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-siam-yellow" />
            {t("subscriptionBenefit3")}
          </li>
        </ul>
        <Button variant="primary" className="w-full">
          {t("upgradeSubscription")}
        </Button>
      </CardContent>
    </Card>
  );
}
