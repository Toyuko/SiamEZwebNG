import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function FreelancerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) {
    redirect(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/portal/freelancer`)}`);
  }

  if (session.user.role !== "freelancer") {
    redirect(`/${locale}/portal`);
  }

  return children;
}
