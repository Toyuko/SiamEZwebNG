import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function CompanyPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) {
    redirect(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/portal/company`)}`);
  }

  if (session.user.role !== "company") {
    redirect(`/${locale}/portal`);
  }

  return children;
}
