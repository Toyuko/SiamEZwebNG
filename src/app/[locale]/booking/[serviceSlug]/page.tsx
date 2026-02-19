import { redirect } from "next/navigation";

/** Redirect legacy /booking/[slug] to /book/[slug] */
export default async function BookingLegacyRedirect({
  params,
}: {
  params: Promise<{ locale: string; serviceSlug: string }>;
}) {
  const { locale, serviceSlug } = await params;
  redirect(`/${locale}/book/${serviceSlug}`);
}
