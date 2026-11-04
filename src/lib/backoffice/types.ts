export type BackofficeRole = "admin" | "staff";

export type BackofficeActor = {
  id: string | null;
  email: string;
  name: string | null;
  role: BackofficeRole;
  bypass: boolean;
};

export type BackofficeContext = {
  lastCustomerId?: string | null;
  lastCustomerName?: string | null;
  lastCaseId?: string | null;
  lastCaseNumber?: string | null;
};

export type AssistantLink = { href: string; label: string };

export const CONFIRMABLE_TOOLS = [
  "create_follow_up",
  "save_draft_quote",
  "send_appointment_reminders",
  "create_customer",
  "send_payment_reminders",
] as const;

export type ConfirmableTool = (typeof CONFIRMABLE_TOOLS)[number];

export type PendingProposal = {
  toolName: ConfirmableTool;
  summary: string;
  payload: Record<string, unknown>;
};

export type AssistantFact = {
  title: string;
  lines: string[];
  links: AssistantLink[];
  context?: BackofficeContext;
  pending?: PendingProposal;
};

export function isConfirmableTool(value: string): value is ConfirmableTool {
  return (CONFIRMABLE_TOOLS as readonly string[]).includes(value);
}

export function renderFact(fact: AssistantFact): string {
  return [fact.title, ...fact.lines].filter((line) => line.trim().length > 0).join("\n");
}

export function readContext(value: unknown): BackofficeContext {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const str = (key: keyof BackofficeContext) =>
    typeof v[key] === "string" ? (v[key] as string) : null;
  return {
    lastCustomerId: str("lastCustomerId"),
    lastCustomerName: str("lastCustomerName"),
    lastCaseId: str("lastCaseId"),
    lastCaseNumber: str("lastCaseNumber"),
  };
}
