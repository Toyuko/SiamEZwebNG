import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Account",
  robots: noindexRobots,
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    const locale = await getLocale();
    redirect(`/${locale}/portal`);
  }
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(30,64,175,0.12),_transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18),_transparent_50%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
