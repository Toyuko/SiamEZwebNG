import type { Metadata } from "next";
import { AdminChrome } from "@/components/layout/AdminChrome";
import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Admin",
  robots: noindexRobots,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Local/dev only — ignored in production / Vercel preview (see isAdminAuthBypassEnabled)
  const bypassAuth = isAdminAuthBypassEnabled();

  if (!bypassAuth) {
    const session = await getSession();
    const locale = await getLocale();

    if (!session) {
      redirect(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/admin`)}`);
    }

    // Block portal roles: only staff and admin can access /admin
    if (
      session.user.role === "customer" ||
      session.user.role === "freelancer" ||
      session.user.role === "company"
    ) {
      const portalPath =
        session.user.role === "freelancer"
          ? "portal/freelancer"
          : session.user.role === "company"
            ? "portal/company"
            : "portal";
      redirect(`/${locale}/${portalPath}`);
    }
  }

  return <AdminChrome>{children}</AdminChrome>;
}
