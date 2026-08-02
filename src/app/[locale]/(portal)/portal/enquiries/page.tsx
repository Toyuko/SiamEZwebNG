import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { listMyListingEnquiries } from "@/data-access/listing-enquiries";
import { EnquiriesClient } from "./EnquiriesClient";

export const dynamic = "force-dynamic";

export default async function PortalEnquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("listingEnquiry");

  const enquiries = await listMyListingEnquiries(session.user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("inboxTitle")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">{t("inboxSubtitle")}</p>
      <div className="mt-8">
        <EnquiriesClient enquiries={enquiries} />
      </div>
    </div>
  );
}
