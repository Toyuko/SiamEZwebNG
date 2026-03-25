import { getCasesByUserId } from "./case";
import { getInvoicesByUserId } from "./invoice";
import { getDocumentsByUserId } from "./document";
import type { ActivityItem } from "@/components/portal/ActivityFeed";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export async function getRecentActivityForUser(
  userId: string,
  maxItems = 10
): Promise<ActivityItem[]> {
  const [cases, invoices, documents] = await Promise.all([
    getCasesByUserId(userId),
    getInvoicesByUserId(userId),
    getDocumentsByUserId(userId),
  ]);

  const items: ActivityItem[] = [];

  cases.slice(0, 5).forEach((c) => {
    items.push({
      id: `case-${c.id}`,
      type: "case",
      title: `${c.caseNumber}: ${c.service.name}`,
      timestamp: formatRelativeTime(c.updatedAt),
      action: getCaseAction(c.status),
      status: getCaseStatus(c.status),
    });
  });

  invoices.slice(0, 3).forEach((inv) => {
    items.push({
      id: `invoice-${inv.id}`,
      type: "invoice",
      title: `Invoice: ${inv.case.service.name}`,
      timestamp: formatRelativeTime(inv.createdAt),
      action: inv.status === "unpaid" ? "Pending Payment" : inv.status,
      status: inv.status === "unpaid" ? "pending" : inv.status === "paid" ? "completed" : "info",
    });
  });

  documents.slice(0, 3).forEach((doc) => {
    items.push({
      id: `doc-${doc.id}`,
      type: "document",
      title: doc.name,
      timestamp: formatRelativeTime(doc.createdAt),
      action: "Document",
      status: "info",
    });
  });

  // Sort by date desc
  const dateMap = new Map<string, Date>();
  cases.forEach((c) => dateMap.set(`case-${c.id}`, c.updatedAt));
  invoices.forEach((i) => dateMap.set(`invoice-${i.id}`, i.createdAt));
  documents.forEach((d) => dateMap.set(`doc-${d.id}`, d.createdAt));

  items.sort((a, b) => {
    const da = dateMap.get(a.id)?.getTime() ?? 0;
    const db = dateMap.get(b.id)?.getTime() ?? 0;
    return db - da;
  });

  return items.slice(0, maxItems);
}

function getCaseAction(status: string): string {
  switch (status) {
    case "quoted":
    case "awaiting_payment":
      return "Pending Payment";
    case "pending_docs":
      return "Required Documents";
    case "completed":
      return "Completed";
    default:
      return "In Progress";
  }
}

function getCaseStatus(
  status: string
): "required" | "pending" | "completed" | "info" {
  switch (status) {
    case "quoted":
    case "awaiting_payment":
      return "pending";
    case "pending_docs":
      return "required";
    case "completed":
      return "completed";
    default:
      return "info";
  }
}
