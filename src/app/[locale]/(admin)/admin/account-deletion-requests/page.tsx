import { getAccountDeletionRequests } from "@/actions/account-deletion";
import { AccountDeletionRequestsClient } from "./AccountDeletionRequestsClient";

export const dynamic = "force-dynamic";

export default async function AdminAccountDeletionRequestsPage() {
  const requests = await getAccountDeletionRequests({ status: "ALL" });
  const serialized = requests.map((r) => ({
    id: r.id,
    email: r.email,
    userId: r.userId,
    status: r.status,
    source: r.source,
    locale: r.locale,
    adminNotes: r.adminNotes,
    requestedAt: r.requestedAt.toISOString(),
    processingAt: r.processingAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    processedBy: r.processedBy
      ? { name: r.processedBy.name, email: r.processedBy.email }
      : null,
    auditLogs: r.auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
    })),
  }));

  return <AccountDeletionRequestsClient requests={serialized} />;
}
