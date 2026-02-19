import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./ProfileForm";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Manage your account details.
      </p>
      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={session.user} />
        </CardContent>
      </Card>
    </div>
  );
}
