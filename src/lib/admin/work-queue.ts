import { prisma } from "@/lib/db";

export type WorkQueueItem = {
  id: string;
  kind: "payment" | "workflow_approval" | "freelancer" | "company" | "listing_enquiry";
  title: string;
  href: string;
  ageHours: number;
};

const ageHours = (date: Date) => Math.max(0, Math.floor((Date.now() - date.getTime()) / 3_600_000));

export async function getWorkQueue(): Promise<WorkQueueItem[]> {
  const [payments, approvals, freelancers, companies, enquiries] = await Promise.all([
    prisma.payment.findMany({ where: { status: "submitted" }, orderBy: { submittedAt: "asc" }, take: 30, select: { id: true, submittedAt: true, case: { select: { caseNumber: true } } } }),
    prisma.workflowStepRun.findMany({ where: { status: "pending", templateStep: { requiresApproval: true } }, orderBy: { createdAt: "asc" }, take: 30, select: { id: true, createdAt: true, runId: true, templateStep: { select: { titleEn: true } } } }),
    prisma.freelancerProfile.findMany({ where: { verificationStatus: "pending" }, orderBy: { createdAt: "asc" }, take: 30, select: { id: true, createdAt: true, title: true, user: { select: { name: true } } } }),
    prisma.company.findMany({ where: { isVerified: false }, orderBy: { createdAt: "asc" }, take: 30, select: { id: true, createdAt: true, companyName: true } }),
    prisma.listingEnquiry.findMany({ where: { status: "new" }, orderBy: { createdAt: "asc" }, take: 30, select: { id: true, createdAt: true, listingType: true, listingId: true } }),
  ]);
  return [
    ...payments.map((row) => ({ id: row.id, kind: "payment" as const, title: `Payment for ${row.case.caseNumber}`, href: `/admin/payments`, ageHours: ageHours(row.submittedAt) })),
    ...approvals.map((row) => ({ id: row.id, kind: "workflow_approval" as const, title: `Workflow approval: ${row.templateStep.titleEn}`, href: `/admin/workflows/approvals`, ageHours: ageHours(row.createdAt) })),
    ...freelancers.map((row) => ({ id: row.id, kind: "freelancer" as const, title: `Freelancer: ${row.user.name ?? row.title ?? row.id}`, href: `/admin/freelancers`, ageHours: ageHours(row.createdAt) })),
    ...companies.map((row) => ({ id: row.id, kind: "company" as const, title: `Company: ${row.companyName}`, href: `/admin/companies`, ageHours: ageHours(row.createdAt) })),
    ...enquiries.map((row) => ({ id: row.id, kind: "listing_enquiry" as const, title: `New ${row.listingType} enquiry`, href: `/admin/${row.listingType === "vehicle" ? "sales" : "real-estate"}`, ageHours: ageHours(row.createdAt) })),
  ].sort((a, b) => b.ageHours - a.ageHours);
}
