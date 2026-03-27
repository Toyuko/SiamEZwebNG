import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { parseNotificationPreferences } from "@/lib/notification-preferences";
import { PortalSettings } from "./PortalSettings";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: { select: { provider: true } },
    },
  });

  if (!dbUser) {
    throw new Error("User not found");
  }

  const hasPassword = !!dbUser.passwordHash;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("settings")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">{t("settingsSubtitle")}</p>
      <PortalSettings
        hasPassword={hasPassword}
        user={{
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone,
          image: dbUser.image,
          timezone: dbUser.timezone,
          preferredLocale: dbUser.preferredLocale ?? locale,
          lastLoginAt: dbUser.lastLoginAt ? dbUser.lastLoginAt.toISOString() : null,
          notificationPreferences: parseNotificationPreferences(dbUser.notificationPreferences),
          linkedProviders: dbUser.accounts.map((a) => a.provider),
        }}
      />
    </div>
  );
}
