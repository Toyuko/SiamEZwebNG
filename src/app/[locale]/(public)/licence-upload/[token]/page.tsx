import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { LicenceUploadClient } from "@/components/licence/LicenceUploadClient";
import { loadPublicUploadLink } from "@/lib/licence-verification/upload-request";

export const dynamic = "force-dynamic";

export default async function LicenceUploadPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  const view = await loadPublicUploadLink(
    token,
    session ? { id: session.user.id, role: session.user.role } : null,
    locale
  );
  if (!view) notFound();
  return <LicenceUploadClient locale={locale} token={token} initial={view} />;
}
