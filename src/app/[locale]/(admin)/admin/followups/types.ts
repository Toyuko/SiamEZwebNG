import type {
  FollowUpPriority,
  FollowUpReminderStatus,
  FollowUpStatus,
  FollowUpType,
} from "@prisma/client";

export type FollowUpPerson = {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
};

export type FollowUpServiceRef = {
  id: string;
  name: string;
  slug: string;
};

export type FollowUpCaseRef = {
  id: string;
  caseNumber: string;
};

export type FollowUpRow = {
  id: string;
  title: string;
  description: string | null;
  followUpType: FollowUpType;
  dueDate: string;
  dueTime: string | null;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  emailReminderEnabled: boolean;
  emailReminderDate: string | null;
  reminderSentAt: string | null;
  reminderStatus: FollowUpReminderStatus;
  notes: string | null;
  clientId: string;
  caseId: string | null;
  serviceId: string | null;
  assignedStaffId: string | null;
  client: FollowUpPerson;
  service: FollowUpServiceRef | null;
  case: FollowUpCaseRef | null;
  assignedStaff: { id: string; name: string | null; email: string } | null;
};

export type FollowUpStats = {
  total: number;
  completed: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
  dueWeek: number;
  dueMonth: number;
  highPriority: number;
  assignedToMe: number;
  upcoming: number;
  emailsSent: number;
  emailsFailed: number;
  completionRate: number;
};

export type StaffOption = { id: string; name: string | null; email: string };
export type ServiceOption = { id: string; name: string; slug: string };
export type ClientOption = { id: string; name: string | null; email: string };

export type FollowUpFiltersState = {
  search?: string;
  serviceId?: string;
  followUpType?: string;
  status?: string;
  priority?: string;
  assignedStaffId?: string;
  reminderStatus?: string;
  dueFrom?: string;
  dueTo?: string;
  bucket?: string;
  view?: string;
  page?: string;
};

export function serializeFollowUp(f: {
  id: string;
  title: string;
  description: string | null;
  followUpType: FollowUpType;
  dueDate: Date | string;
  dueTime: string | null;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  emailReminderEnabled: boolean;
  emailReminderDate: Date | string | null;
  reminderSentAt: Date | string | null;
  reminderStatus: FollowUpReminderStatus;
  notes: string | null;
  clientId: string;
  caseId: string | null;
  serviceId: string | null;
  assignedStaffId: string | null;
  client: FollowUpPerson;
  service: FollowUpServiceRef | null;
  case: FollowUpCaseRef | null;
  assignedStaff: { id: string; name: string | null; email: string } | null;
}): FollowUpRow {
  const dateOnly = (d: Date | string | null | undefined) => {
    if (!d) return null;
    if (typeof d === "string") return d.slice(0, 10);
    return d.toISOString().slice(0, 10);
  };
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    followUpType: f.followUpType,
    dueDate: dateOnly(f.dueDate) ?? "",
    dueTime: f.dueTime,
    status: f.status,
    priority: f.priority,
    emailReminderEnabled: f.emailReminderEnabled,
    emailReminderDate: dateOnly(f.emailReminderDate),
    reminderSentAt: f.reminderSentAt
      ? typeof f.reminderSentAt === "string"
        ? f.reminderSentAt
        : f.reminderSentAt.toISOString()
      : null,
    reminderStatus: f.reminderStatus,
    notes: f.notes,
    clientId: f.clientId,
    caseId: f.caseId,
    serviceId: f.serviceId,
    assignedStaffId: f.assignedStaffId,
    client: f.client,
    service: f.service,
    case: f.case,
    assignedStaff: f.assignedStaff,
  };
}
