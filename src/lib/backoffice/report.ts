import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { ensureBackofficeCatalogue } from "@/lib/backoffice/catalogue";
import { formatSatang } from "@/lib/backoffice/format";
import { getOperationsSnapshot } from "@/lib/backoffice/records";
import { todayInBangkok, toUtcDateOnly } from "@/lib/follow-ups/dates";

async function reportRecipient(): Promise<string | null> {
  const fromEnv = process.env.BACKOFFICE_REPORT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  const setting = await prisma.appSetting.findUnique({ where: { key: "backoffice_report_email" } });
  if (!setting) return null;
  if (typeof setting.value === "string") return setting.value.trim() || null;
  if (setting.value && typeof setting.value === "object" && "email" in setting.value) {
    const email = (setting.value as { email?: unknown }).email;
    return typeof email === "string" && email.trim() ? email.trim() : null;
  }
  return null;
}

function reportText(kind: "morning" | "eod", snapshot: Awaited<ReturnType<typeof getOperationsSnapshot>>): string {
  return [
    kind === "eod" ? "SiamEZ end-of-day report" : "SiamEZ morning report",
    "Timezone: Asia/Bangkok",
    `Bookings today: ${snapshot.todayBookings}`,
    `Unconfirmed bookings: ${snapshot.unconfirmedBookings}`,
    `Outstanding: ${formatSatang(snapshot.outstandingPaymentsSatang)} (${snapshot.outstandingPaymentCount})`,
    `Missing documents: ${snapshot.missingDocuments}`,
    `Open quotations: ${snapshot.openQuotes}`,
    `Renewals this month: ${snapshot.renewalsThisMonth}`,
    `Overdue renewals: ${snapshot.overdueRenewals}`,
    `Vehicle sourcing leads: ${snapshot.vehicleSourcingOpen}`,
    `Tasks due: ${snapshot.followUpsDue}`,
    `Overdue tasks: ${snapshot.overdueTasks}`,
    `New customers today: ${snapshot.newCustomersToday}`,
    `Approved revenue today: ${formatSatang(snapshot.revenueTodaySatang)}`,
    ...snapshot.recommendations,
  ].join("\n");
}

export async function publishDailyReport(kind: "morning" | "eod"): Promise<{
  emailed: boolean;
  error?: string;
}> {
  await ensureBackofficeCatalogue();
  const snapshot = await getOperationsSnapshot(kind);
  const reportDate = toUtcDateOnly(todayInBangkok());
  const saved = await prisma.backofficeDailyReport.upsert({
    where: { reportDate_kind: { reportDate, kind } },
    create: { reportDate, kind, snapshot },
    update: { snapshot },
  });
  const to = await reportRecipient();
  if (!to) return { emailed: false };
  const text = reportText(kind, snapshot);
  const result = await sendEmail({
    to,
    subject: kind === "eod" ? "SiamEZ end-of-day report" : "SiamEZ morning report",
    text,
    html: `<pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
  });
  if (!result.ok) return { emailed: false, error: result.error };
  await prisma.backofficeDailyReport.update({
    where: { id: saved.id },
    data: { emailedAt: new Date() },
  });
  return { emailed: true };
}
