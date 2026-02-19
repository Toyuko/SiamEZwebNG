import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PortalLayoutClient } from "./PortalLayoutClient";

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

  return (
    <PortalLayoutClient user={session.user}>{children}</PortalLayoutClient>
  );
}
