import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getRecentActivityForUser } from "@/data-access/activity";
import { NotificationsList } from "@/components/portal/NotificationsList";
import { Link } from "@/i18n/navigation";

export default async function PortalNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const items = await getRecentActivityForUser(session.user.id, 40);

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <Link
          href="/portal"
          className="text-sm font-medium text-siam-blue hover:underline"
        >
          ← {t("dashboard")}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t("notifications")}
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        {t("notificationsSubtitle")}
      </p>
      <div className="mt-8">
        <NotificationsList
          items={items}
          emptyLabel={t("notificationsEmpty")}
          managePrefsLabel={t("manageNotificationPrefs")}
        />
      </div>
    </div>
  );
}
