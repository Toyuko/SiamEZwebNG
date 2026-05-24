import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClientJobTrackingView } from "@/components/client/ClientJobTrackingView";

export default async function ClientJobTrackingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();

  const job = await prisma.job.findUnique({
    where: { id },
    select: { postedById: true },
  });

  if (!job) {
    const currentLocale = await getLocale();
    redirect(`/${currentLocale}/portal`);
  }

  if (job.postedById !== session.user.id) {
    const currentLocale = await getLocale();
    redirect(`/${currentLocale}/portal`);
  }

  return <ClientJobTrackingView jobId={id} currentUserId={session.user.id} />;
}
