import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { getAccountDeletionProcessingDays } from "@/config/account-deletion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountDeletion" });
  return buildPageMetadata({
    locale,
    path: "/delete-account",
    title: t("metaTitle"),
    description: t("metaDescription", { days: getAccountDeletionProcessingDays() }),
  });
}

export default async function DeleteAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountDeletion");
  const processingDays = getAccountDeletionProcessingDays();

  return (
    <>
      <PageHero title={t("title")} description={t("description")} />
      <section className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <DeleteAccountForm processingDays={processingDays} />
      </section>
    </>
  );
}
