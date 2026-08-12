import { getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/seo/NotFoundContent";

export default async function LocaleNotFound() {
  const t = await getTranslations("seo");

  return (
    <NotFoundContent
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      home={t("notFoundHome")}
      services={t("notFoundServices")}
      book={t("notFoundBook")}
      concierge={t("notFoundConcierge")}
    />
  );
}
