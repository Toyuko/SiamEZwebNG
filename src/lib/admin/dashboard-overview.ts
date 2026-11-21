import { prisma } from "@/lib/db";
import type { CaseStatus, InvoiceStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getDriverLicenseRenewalStats } from "@/lib/driver-license-renewal/service";
import { todayInBangkok, toUtcDateOnly } from "@/lib/driver-license-renewal/dates";
import { softLaunch } from "@/config/soft-launch";
import { missingRequiredDocuments } from "@/lib/backoffice/documents";

const CLOSED_CASES: CaseStatus[] = ["completed", "cancelled", "refunded"];
const OPEN_INVOICE: InvoiceStatus[] = ["unpaid", "pending_verification", "draft"];

export type DashboardActionItem = {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  priority: 1 | 2 | 3 | 4 | 5;
  tone: "danger" | "warning" | "info";
  actionLabel: string;
};

export type DashboardKpis = {
  openCases: number;
  totalClients: number;
  revenue: number;
  pendingInvoices: number;
  pendingPayments: number;
};

export type DashboardDlSummary = {
  dueSoon: number;
  remindersDue: number;
  overdue: number;
  remindersSent: number;
};

export type DashboardRecentCase = {
  id: string;
  caseNumber: string;
  status: string;
  updatedAt: Date;
  serviceName: string | null;
  clientName: string;
};

/** Lightweight KPI counts only — no freelancer/company aggregates. */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const [openCases, totalClients, paidPayments, pendingInvoices, pendingPayments] = await Promise.all([
    prisma.case.count({ where: { status: { notIn: CLOSED_CASES } } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true } }),
    prisma.invoice.count({ where: { status: { in: OPEN_INVOICE } } }),
    prisma.payment.count({ where: { status: "submitted" } }),
  ]);

  return {
    openCases,
    totalClients,
    revenue: paidPayments._sum.amount ?? 0,
    pendingInvoices,
    pendingPayments,
  };
}

export async function getDashboardDlSummary(): Promise<DashboardDlSummary> {
  const stats = await getDriverLicenseRenewalStats();
  return toDlSummary(stats);
}

function toDlSummary(stats: Awaited<ReturnType<typeof getDriverLicenseRenewalStats>>): DashboardDlSummary {
  return {
    dueSoon: stats.renewalsNext30,
    remindersDue: stats.remindersDue,
    overdue: stats.overdue,
    remindersSent: stats.remindersSent,
  };
}

export async function getDashboardRecentCases(limit = 5): Promise<DashboardRecentCase[]> {
  const rows = await prisma.case.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      caseNumber: true,
      status: true,
      updatedAt: true,
      guestName: true,
      guestEmail: true,
      service: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    caseNumber: row.caseNumber,
    status: row.status,
    updatedAt: row.updatedAt,
    serviceName: row.service?.name ?? null,
    clientName:
      row.user?.name ?? row.user?.email ?? row.guestName ?? row.guestEmail ?? "Guest",
  }));
}

function buildActionItems(input: {
  overdueInvoices: number;
  pendingPayments: number;
  dlOverdue: number;
  dlRemindersDue: number;
  pendingAppointments: number;
  missingDocuments: number;
  followUpsDue: number;
  pendingFreelancerApprovals: number;
  pendingCompanyVerifications: number;
  pendingAdCampaigns: number;
}): DashboardActionItem[] {
  const items: DashboardActionItem[] = [];
  const {
    overdueInvoices,
    pendingPayments,
    dlOverdue,
    dlRemindersDue,
    pendingAppointments,
    missingDocuments,
    followUpsDue,
    pendingFreelancerApprovals,
    pendingCompanyVerifications,
    pendingAdCampaigns,
  } = input;

  if (overdueInvoices > 0) {
    items.push({
      id: "invoices-overdue",
      title: "Invoices overdue",
      description: `${overdueInvoices} invoice${overdueInvoices === 1 ? "" : "s"} past due`,
      count: overdueInvoices,
      href: "/admin/invoices?status=unpaid",
      priority: 1,
      tone: "danger",
      actionLabel: "Review",
    });
  }

  if (dlOverdue > 0) {
    items.push({
      id: "dl-overdue",
      title: "Driver's license overdue",
      description: `${dlOverdue} renewal${dlOverdue === 1 ? "" : "s"} past expiry`,
      count: dlOverdue,
      href: "/admin/driver-license-followups?status=due_soon",
      priority: 1,
      tone: "danger",
      actionLabel: "View",
    });
  }

  if (pendingPayments > 0) {
    items.push({
      id: "payments-review",
      title: "Payments awaiting review",
      description: `${pendingPayments} payment${pendingPayments === 1 ? "" : "s"} need verification`,
      count: pendingPayments,
      href: "/admin/payments?status=submitted",
      priority: 2,
      tone: "warning",
      actionLabel: "Review",
    });
  }

  if (dlRemindersDue > 0) {
    items.push({
      id: "dl-reminders",
      title: "Driver's license follow-ups",
      description: `${dlRemindersDue} reminder${dlRemindersDue === 1 ? "" : "s"} due`,
      count: dlRemindersDue,
      href: "/admin/driver-license-followups?status=REMINDER_DUE",
      priority: 2,
      tone: "warning",
      actionLabel: "View",
    });
  }

  if (followUpsDue > 0) {
    items.push({
      id: "followups-due",
      title: "Follow-ups due",
      description: `${followUpsDue} client follow-up${followUpsDue === 1 ? "" : "s"} need attention`,
      count: followUpsDue,
      href: "/admin/followups",
      priority: 2,
      tone: "warning",
      actionLabel: "Open",
    });
  }

  if (pendingAppointments > 0) {
    items.push({
      id: "appointments-pending",
      title: "Pending appointments",
      description: `${pendingAppointments} need confirmation`,
      count: pendingAppointments,
      href: "/admin/calendar",
      priority: 3,
      tone: "info",
      actionLabel: "Review",
    });
  }

  if (missingDocuments > 0) {
    items.push({
      id: "cases-docs",
      title: "Cases awaiting documents",
      description: `${missingDocuments} customer${missingDocuments === 1 ? "" : "s"} need to upload documents`,
      count: missingDocuments,
      href: "/admin/cases?status=pending_docs",
      priority: 4,
      tone: "info",
      actionLabel: "Open Cases",
    });
  }

  if (pendingFreelancerApprovals > 0) {
    items.push({
      id: "freelancer-approvals",
      title: "Freelancer jobs awaiting approval",
      description: `${pendingFreelancerApprovals} completed job${pendingFreelancerApprovals === 1 ? "" : "s"} to review`,
      count: pendingFreelancerApprovals,
      href: "/admin/service-jobs?source=freelancer&status=completed_awaiting_review",
      priority: 3,
      tone: "warning",
      actionLabel: "Review",
    });
  }

  if (pendingCompanyVerifications > 0) {
    items.push({
      id: "company-verify",
      title: "Companies awaiting verification",
      description: `${pendingCompanyVerifications} compan${pendingCompanyVerifications === 1 ? "y" : "ies"} to verify`,
      count: pendingCompanyVerifications,
      href: "/admin/companies",
      priority: 4,
      tone: "info",
      actionLabel: "Review",
    });
  }

  if (pendingAdCampaigns > 0) {
    items.push({
      id: "ads-pending",
      title: "Ads pending review",
      description: `${pendingAdCampaigns} campaign${pendingAdCampaigns === 1 ? "" : "s"} waiting`,
      count: pendingAdCampaigns,
      href: "/admin/ad-campaigns?status=PENDING",
      priority: 5,
      tone: "info",
      actionLabel: "Review",
    });
  }

  return items.sort((a, b) => a.priority - b.priority || b.count - a.count);
}

export async function getDashboardOverview() {
  const today = toUtcDateOnly(todayInBangkok());
  const now = new Date();

  const [
    kpis,
    recentCases,
    dlStats,
    overdueInvoices,
    pendingAppointments,
    docCases,
    followUpsDue,
    pendingFreelancerApprovals,
    pendingCompanyVerifications,
    pendingAdCampaigns,
  ] = await Promise.all([
    getDashboardKpis(),
    getDashboardRecentCases(5),
    getDriverLicenseRenewalStats(),
    prisma.invoice.count({
      where: {
        status: { in: ["unpaid", "pending_verification"] },
        dueDate: { lt: now },
      },
    }),
    prisma.case.count({
      where: {
        status: { in: ["new", "under_review", "confirmed"] },
        scheduledAt: { gte: now },
      },
    }),
    prisma.case.findMany({
      where: {
        status: { in: ["pending_docs", "in_progress", "paid", "under_review"] },
        documentsRequired: { not: Prisma.DbNull },
      },
      select: {
        documentsRequired: true,
        documents: { select: { name: true, documentType: true } },
      },
      take: 80,
    }),
    prisma.followUp.count({
      where: {
        status: { in: ["PENDING", "DUE", "IN_PROGRESS"] },
        dueDate: { lte: today },
      },
    }),
    softLaunch.enabled && !softLaunch.showFreelancerOps
      ? Promise.resolve(0)
      : prisma.job.count({
          where: { status: { in: ["completed_awaiting_review", "completed"] } },
        }),
    softLaunch.enabled && !softLaunch.showCompanies
      ? Promise.resolve(0)
      : prisma.company.count({ where: { isVerified: false } }),
    softLaunch.enabled && !softLaunch.showCompanies
      ? Promise.resolve(0)
      : prisma.adCampaign.count({ where: { status: "PENDING" } }),
  ]);

  const missingDocuments = docCases.filter(
    (row) => missingRequiredDocuments(row.documentsRequired, row.documents).length > 0
  ).length;

  const actionRequired = buildActionItems({
    overdueInvoices,
    pendingPayments: kpis.pendingPayments,
    dlOverdue: dlStats.overdue,
    dlRemindersDue: dlStats.remindersDue,
    pendingAppointments,
    missingDocuments,
    followUpsDue,
    pendingFreelancerApprovals,
    pendingCompanyVerifications,
    pendingAdCampaigns,
  });

  return {
    kpis,
    actionRequired,
    recentCases,
    dlSummary: toDlSummary(dlStats),
  };
}
