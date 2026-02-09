"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function PortalFooter() {
  const t = useTranslations("portal");
  const tSite = useTranslations("site");

  return (
    <footer className="mt-12 border-t border-gray-200 bg-gray-50 py-6 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} {tSite("companyName")}. {tSite("allRightsReserved")}
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/privacy-policy" className="hover:text-siam-blue dark:hover:text-siam-blue-light">
            {t("privacyPolicy")}
          </Link>
          <Link href="/terms-of-service" className="hover:text-siam-blue dark:hover:text-siam-blue-light">
            {t("termsOfService")}
          </Link>
          <Link href="/contact" className="hover:text-siam-blue dark:hover:text-siam-blue-light">
            {t("contactSupport")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
