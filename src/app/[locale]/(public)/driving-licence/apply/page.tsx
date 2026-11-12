import { setRequestLocale } from "next-intl/server";
import { LicenceApplyForm } from "@/components/licence/LicenceApplyForm";

export const dynamic = "force-dynamic";

export default async function LicenceApplyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LicenceApplyForm locale={locale} />;
}
