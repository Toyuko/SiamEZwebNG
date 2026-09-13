"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import {
  addFollowUpNote,
  assignFollowUp,
  cancelFollowUp,
  completeFollowUp,
  createFollowUp,
  sendFollowUpReminder,
  snoozeFollowUp,
  updateFollowUp,
  type CreateFollowUpInput,
  type UpdateFollowUpInput,
} from "@/lib/follow-ups/service";
import {
  applyFollowUpTemplate,
  createFollowUpTemplate,
  deleteFollowUpTemplate,
  updateFollowUpTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from "@/lib/follow-ups/templates";
import {
  getClientFollowUpGroups,
  getFollowUpById,
  getFollowUpStats,
  getFollowUpsForCalendar,
  listFollowUps,
  syncOverdueStatuses,
  type FollowUpListFilters,
} from "@/lib/follow-ups/queries";
import { prisma } from "@/lib/db";
import type {
  FollowUpPriority,
  FollowUpStatus,
  FollowUpType,
} from "@prisma/client";

function revalidateFollowUps(clientId?: string | null, caseId?: string | null) {
  revalidatePath("/admin/followups");
  revalidatePath("/admin/calendar");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
  if (caseId) revalidatePath(`/admin/cases/${caseId}`);
}

export async function adminListFollowUps(filters: FollowUpListFilters = {}) {
  const session = await requireStaff();
  await syncOverdueStatuses();
  return listFollowUps({
    ...filters,
    currentStaffId: session.user.id,
  });
}

export async function adminGetFollowUpStats() {
  const session = await requireStaff();
  await syncOverdueStatuses();
  return getFollowUpStats({ currentStaffId: session.user.id });
}

export async function adminGetFollowUp(id: string) {
  await requireStaff();
  return getFollowUpById(id);
}

export async function adminGetClientFollowUps(clientId: string) {
  await requireStaff();
  return getClientFollowUpGroups(clientId);
}

export async function adminGetFollowUpsForCalendar(input: {
  from: string;
  to: string;
  assignedStaffId?: string;
}) {
  await requireStaff();
  return getFollowUpsForCalendar(input);
}

export async function adminCreateFollowUp(
  data: Omit<CreateFollowUpInput, "createdById">
) {
  const session = await requireStaff();
  const followUp = await createFollowUp({
    ...data,
    createdById: session.user.id,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminUpdateFollowUp(
  id: string,
  data: Omit<UpdateFollowUpInput, "actorId">
) {
  const session = await requireStaff();
  const followUp = await updateFollowUp(id, {
    ...data,
    actorId: session.user.id,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminCompleteFollowUp(id: string, notes?: string) {
  const session = await requireStaff();
  const followUp = await completeFollowUp({
    id,
    actorId: session.user.id,
    notes,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminCancelFollowUp(id: string, notes?: string) {
  const session = await requireStaff();
  const followUp = await cancelFollowUp({
    id,
    actorId: session.user.id,
    notes,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminSnoozeFollowUp(input: {
  id: string;
  days?: number;
  untilDate?: string;
}) {
  const session = await requireStaff();
  const followUp = await snoozeFollowUp({
    id: input.id,
    days: input.days,
    untilDate: input.untilDate,
    actorId: session.user.id,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminAssignFollowUp(
  id: string,
  assignedStaffId: string | null
) {
  const session = await requireStaff();
  const followUp = await assignFollowUp({
    id,
    assignedStaffId,
    actorId: session.user.id,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminAddFollowUpNote(id: string, note: string) {
  const session = await requireStaff();
  const followUp = await addFollowUpNote({
    id,
    note,
    actorId: session.user.id,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminSendFollowUpReminder(
  id: string,
  options?: { force?: boolean }
) {
  const session = await requireStaff();
  const result = await sendFollowUpReminder({
    followUpId: id,
    method: "MANUAL",
    actorId: session.user.id,
    force: options?.force,
  });
  const followUp = await getFollowUpById(id);
  if (followUp) revalidateFollowUps(followUp.clientId, followUp.caseId);
  return result;
}

export async function adminApplyFollowUpTemplate(input: {
  templateId: string;
  clientId: string;
  caseId?: string | null;
  serviceId?: string | null;
  anchorDate?: string;
  assignedStaffId?: string | null;
}) {
  const session = await requireStaff();
  const followUp = await applyFollowUpTemplate({
    ...input,
    createdById: session.user.id,
  });
  revalidateFollowUps(followUp.clientId, followUp.caseId);
  return { ok: true as const, followUp };
}

export async function adminListFollowUpTemplates() {
  await requireStaff();
  return prisma.followUpTemplate.findMany({
    include: {
      service: { select: { id: true, name: true, slug: true } },
      defaultAssignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function adminCreateFollowUpTemplate(
  data: Omit<CreateTemplateInput, "createdById">
) {
  const session = await requireStaff();
  const template = await createFollowUpTemplate({
    ...data,
    createdById: session.user.id,
  });
  revalidatePath("/admin/followups");
  revalidatePath("/admin/followups/templates");
  return { ok: true as const, template };
}

export async function adminUpdateFollowUpTemplate(
  id: string,
  data: UpdateTemplateInput
) {
  await requireStaff();
  const template = await updateFollowUpTemplate(id, data);
  revalidatePath("/admin/followups");
  revalidatePath("/admin/followups/templates");
  return { ok: true as const, template };
}

export async function adminDeleteFollowUpTemplate(id: string) {
  await requireStaff();
  await deleteFollowUpTemplate(id);
  revalidatePath("/admin/followups");
  revalidatePath("/admin/followups/templates");
  return { ok: true as const };
}

export async function adminSetFollowUpStatus(
  id: string,
  status: FollowUpStatus
) {
  const session = await requireStaff();
  if (status === "COMPLETED") {
    return adminCompleteFollowUp(id);
  }
  if (status === "CANCELLED") {
    return adminCancelFollowUp(id);
  }
  const followUp = await updateFollowUp(id, {
    actorId: session.user.id,
  });
  // Direct status via prisma for IN_PROGRESS / PENDING
  const updated = await prisma.followUp.update({
    where: { id },
    data: { status },
  });
  revalidateFollowUps(updated.clientId, updated.caseId);
  return { ok: true as const, followUp: { ...followUp, status: updated.status } };
}

export type QuickCreateFollowUpForm = {
  clientId: string;
  caseId?: string;
  serviceId?: string;
  title: string;
  description?: string;
  followUpType: FollowUpType;
  dueDate: string;
  priority: FollowUpPriority;
  assignedStaffId?: string;
  emailReminderEnabled?: boolean;
  emailReminderDate?: string;
  notes?: string;
};
