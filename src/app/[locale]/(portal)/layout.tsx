import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { PortalLayoutClient } from "./PortalLayoutClient";
import { FirstRunOnboarding } from "@/components/auth/FirstRunOnboarding";
import { getConciergeSettings } from "@/lib/concierge-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  let firstRunUser:
    | {
        role: string;
        name: string | null;
        phone: string | null;
        preferredLocale: string | null;
        createdAt: Date;
      }
    | null = null;

  if (session.user.role === "customer") {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        name: true,
        phone: true,
        preferredLocale: true,
        createdAt: true,
      },
    });
    if (dbUser) {
      firstRunUser = dbUser;
    }
  }

  const [settings, flagEnabled] = await Promise.all([
    getConciergeSettings(),
    isFeatureEnabled("concierge_enabled"),
  ]);
  const showConcierge = settings.enabled && flagEnabled;

  return (
    <PortalLayoutClient user={session.user} showConcierge={showConcierge}>
      {firstRunUser ? (
        <Suspense fallback={null}>
          <FirstRunOnboarding user={firstRunUser} />
        </Suspense>
      ) : null}
      {children}
    </PortalLayoutClient>
  );
}
