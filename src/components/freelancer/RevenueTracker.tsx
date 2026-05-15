import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJobAmount } from "@/data-access/job";
import { TrendingUp, Clock } from "lucide-react";

export async function RevenueTracker({
  totalEarned,
  pendingClearance,
  currency,
}: {
  totalEarned: number;
  pendingClearance: number;
  currency: string;
}) {
  const t = await getTranslations("freelancer");

  return (
    <Card className="h-full bg-gradient-to-br from-siam-blue to-siam-blue-dark text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5" />
          {t("revenueTracker")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-sm text-white/80">{t("totalEarned")}</p>
          <p className="mt-1 text-2xl font-bold">{formatJobAmount(totalEarned, currency)}</p>
        </div>
        <div className="rounded-lg bg-siam-yellow/20 p-4 backdrop-blur-sm">
          <p className="flex items-center gap-1 text-sm text-siam-yellow-light">
            <Clock className="h-4 w-4" />
            {t("pendingClearance")}
          </p>
          <p className="mt-1 text-2xl font-bold text-siam-yellow">
            {formatJobAmount(pendingClearance, currency)}
          </p>
          <p className="mt-1 text-xs text-white/70">{t("pendingClearanceHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
