import { missingRequiredDocuments } from "@/lib/backoffice/documents";

export const DEFAULT_STAGES = [
  "New enquiry",
  "Booking received",
  "Awaiting deposit",
  "Documents requested",
  "Documents received",
  "Documents under review",
  "Ready for processing",
  "Processing",
  "Awaiting external authority",
  "Completed",
  "Awaiting final payment",
  "Closed",
] as const;

const STATUS_TO_STAGE: Record<string, string> = {
  new: "Booking received",
  quoted: "New enquiry",
  awaiting_payment: "Awaiting deposit",
  awaiting_initial_payment: "Awaiting deposit",
  pending_docs: "Documents requested",
  under_review: "Documents under review",
  confirmed: "Ready for processing",
  paid: "Ready for processing",
  in_progress: "Processing",
  completed: "Completed",
  cancelled: "Closed",
  refunded: "Closed",
};

export type WorkflowTemplateSeed = {
  serviceKey: string;
  name: string;
  match: string[];
  documents: string[];
  stages: string[];
  taskTitle: string;
};

const stages = [...DEFAULT_STAGES];

export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplateSeed[] = [
  {
    serviceKey: "driving_licence_renewal",
    name: "Driving licence renewal",
    match: ["licence renewal", "license renewal"],
    documents: ["Passport", "Current driving licence", "Photographs"],
    stages,
    taskTitle: "Process driving licence renewal",
  },
  {
    serviceKey: "international_driving_permit",
    name: "International driving permit",
    match: ["international driving", "idp"],
    documents: ["Passport", "Thai driving licence", "Photographs"],
    stages,
    taskTitle: "Process international driving permit",
  },
  {
    serviceKey: "police_clearance",
    name: "Police clearance",
    match: ["police clearance", "criminal record"],
    documents: ["Passport", "Visa or entry stamp", "Residence certificate"],
    stages,
    taskTitle: "Process police clearance documents",
  },
  {
    serviceKey: "certified_translation",
    name: "Certified translation",
    match: ["translation"],
    documents: ["Original document", "Passport"],
    stages,
    taskTitle: "Prepare certified translation",
  },
  {
    serviceKey: "mfa_legalisation",
    name: "MFA legalisation",
    match: ["legalisation", "legalization", "mfa"],
    documents: ["Original document", "Translation", "Passport"],
    stages,
    taskTitle: "Prepare MFA legalisation",
  },
  {
    serviceKey: "vehicle_registration",
    name: "Vehicle registration",
    match: ["vehicle registration", "car registration", "motorcycle registration"],
    documents: ["Passport", "Visa or entry stamp", "Residence certificate", "Vehicle documents"],
    stages,
    taskTitle: "Process vehicle registration",
  },
  {
    serviceKey: "vehicle_sourcing",
    name: "Vehicle sourcing",
    match: ["sourcing", "finding"],
    documents: ["Passport", "Budget and model notes"],
    stages,
    taskTitle: "Follow up vehicle sourcing request",
  },
  {
    serviceKey: "vehicle_sales",
    name: "Vehicle sales",
    match: ["vehicle sale"],
    documents: ["Passport", "Vehicle ownership documents"],
    stages,
    taskTitle: "Process vehicle sale documents",
  },
  {
    serviceKey: "marriage_registration",
    name: "Marriage registration",
    match: ["marriage"],
    documents: ["Passport", "Visa or entry stamp", "Affirmation of freedom to marry", "Translations"],
    stages,
    taskTitle: "Process marriage registration documents",
  },
  {
    serviceKey: "driving_licence",
    name: "Thai driving licence",
    match: ["driving licence", "driving license", "driver's licence", "driver's license", "motorcycle licence", "motorcycle license"],
    documents: ["Passport", "Visa or entry stamp", "Medical certificate", "Residence certificate", "Photographs"],
    stages,
    taskTitle: "Process driving licence documents",
  },
  {
    serviceKey: "general_service",
    name: "General service",
    match: [],
    documents: ["Passport"],
    stages,
    taskTitle: "Review the new booking",
  },
];

export type AutomationRuleSeed = {
  key: string;
  name: string;
  description: string;
  trigger: string;
  enabled: boolean;
};

export const DEFAULT_AUTOMATION_RULES: AutomationRuleSeed[] = [
  {
    key: "booking_created",
    name: "New booking workflow",
    description: "When a booking is created, build the service checklist, compare uploads, create an internal task if documents are missing, and draft the customer message. The message is not sent.",
    trigger: "booking_created",
    enabled: true,
  },
  {
    key: "payment_received",
    name: "Payment received",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "payment_received",
    enabled: false,
  },
  {
    key: "deposit_overdue",
    name: "Deposit overdue",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "deposit_overdue",
    enabled: false,
  },
  {
    key: "document_uploaded",
    name: "Document uploaded",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "document_uploaded",
    enabled: false,
  },
  {
    key: "document_missing",
    name: "Document missing",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "document_missing",
    enabled: false,
  },
  {
    key: "appointment_approaching",
    name: "Appointment approaching",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "appointment_approaching",
    enabled: false,
  },
  {
    key: "customer_silent",
    name: "Customer has not responded",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "customer_silent",
    enabled: false,
  },
  {
    key: "task_overdue",
    name: "Staff task overdue",
    description: "Stored for staff. Turning this on does not email anyone or create a task.",
    trigger: "task_overdue",
    enabled: false,
  },
];

export function bookingWorkflowKey(caseId: string): string {
  return `booking_created:${caseId}`;
}

export function matchWorkflowTemplate(serviceName: string, templates: WorkflowTemplateSeed[] = DEFAULT_WORKFLOW_TEMPLATES): WorkflowTemplateSeed {
  const haystack = serviceName.toLowerCase();
  return (
    templates.find((template) => template.match.some((token) => haystack.includes(token.toLowerCase()))) ??
    templates.find((template) => template.match.length === 0) ??
    templates[templates.length - 1]!
  );
}

export function draftBookingMessage(input: { customerName: string; serviceName: string; missing: string[] }): string {
  const lines = [`Hello ${input.customerName},`, "", `Thank you for booking ${input.serviceName} with SiamEZ.`];
  if (input.missing.length > 0) {
    lines.push("", "Please send these documents when you can:", ...input.missing.map((item) => `- ${item}`));
  } else {
    lines.push("", "We already have the documents on file for this service. A staff member will review them.");
  }
  lines.push("", "This message is a draft for staff. It has not been sent.", "", "SiamEZ");
  return lines.join("\n");
}

export function planBookingWorkflow(input: {
  serviceName: string;
  templates?: WorkflowTemplateSeed[];
  uploaded: { name: string; documentType: string | null }[];
  customerName: string;
  storedChecklist?: string[];
}): {
  serviceKey: string;
  templateName: string;
  checklist: string[];
  missing: string[];
  taskTitle: string;
  customerMessage: string;
  stage: string;
} {
  const template = matchWorkflowTemplate(input.serviceName, input.templates);
  const checklist = input.storedChecklist && input.storedChecklist.length > 0 ? input.storedChecklist : template.documents;
  const missing = missingRequiredDocuments(checklist, input.uploaded);
  return {
    serviceKey: template.serviceKey,
    templateName: template.name,
    checklist,
    missing,
    taskTitle: template.taskTitle,
    customerMessage: draftBookingMessage({
      customerName: input.customerName,
      serviceName: input.serviceName,
      missing,
    }),
    stage: "Booking received",
  };
}

export function stageForCaseStatus(status: string, stageList: readonly string[] = DEFAULT_STAGES): string {
  const label = STATUS_TO_STAGE[status] ?? "Booking received";
  return stageList.includes(label) ? label : (stageList[0] ?? label);
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}
