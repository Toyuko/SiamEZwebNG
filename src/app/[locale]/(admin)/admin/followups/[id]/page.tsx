import { notFound } from "next/navigation";
import { adminGetFollowUp } from "@/actions/follow-ups";
import {
  getClientsForPicker,
  getServices,
  getStaffUsers,
} from "@/actions/admin";
import { FollowUpDetailClient } from "./FollowUpDetailClient";

export const dynamic = "force-dynamic";

function dateOnly(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export default async function AdminFollowUpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [followUp, staff, services, clients] = await Promise.all([
    adminGetFollowUp(id),
    getStaffUsers(),
    getServices(),
    getClientsForPicker(),
  ]);

  if (!followUp) notFound();

  return (
    <FollowUpDetailClient
      followUp={{
        id: followUp.id,
        title: followUp.title,
        description: followUp.description,
        followUpType: followUp.followUpType,
        dueDate: dateOnly(followUp.dueDate) ?? "",
        dueTime: followUp.dueTime,
        status: followUp.status,
        priority: followUp.priority,
        emailReminderEnabled: followUp.emailReminderEnabled,
        emailReminderDate: dateOnly(followUp.emailReminderDate),
        emailSubject: followUp.emailSubject,
        emailBody: followUp.emailBody,
        reminderSentAt: followUp.reminderSentAt
          ? followUp.reminderSentAt.toISOString()
          : null,
        reminderStatus: followUp.reminderStatus,
        notes: followUp.notes,
        completedAt: followUp.completedAt
          ? followUp.completedAt.toISOString()
          : null,
        clientId: followUp.clientId,
        caseId: followUp.caseId,
        serviceId: followUp.serviceId,
        assignedStaffId: followUp.assignedStaffId,
        client: followUp.client,
        service: followUp.service,
        case: followUp.case,
        assignedStaff: followUp.assignedStaff,
        completedBy: followUp.completedBy,
        createdBy: followUp.createdBy,
        template: followUp.template,
        activities: followUp.activities.map((a) => ({
          id: a.id,
          type: a.type,
          note: a.note,
          fromStatus: a.fromStatus,
          toStatus: a.toStatus,
          createdAt: a.createdAt.toISOString(),
          actor: a.actor,
        })),
      }}
      staff={staff}
      services={services.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      clients={clients}
    />
  );
}
