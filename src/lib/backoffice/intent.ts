import { detectWorkSteps } from "@/lib/backoffice/operations";

export type RenewalWindow = "this_month" | "next_month" | "overdue" | "soon";
export type BookingWhen = "today" | "tomorrow";
export type RevenuePeriod = "today" | "week" | "this_month" | "last_month" | "compare";
export type VehicleKindFilter = "motorcycle" | "car" | null;
export type VehicleLeadFilter = "buy" | "sell" | null;
export type TaskScope = "overdue" | "today";
export type ReportKind = "morning" | "eod";

export type BackofficeIntent =
  | { kind: "help" }
  | { kind: "outstanding_payments" }
  | { kind: "deposits" }
  | { kind: "renewals"; window: RenewalWindow }
  | { kind: "unconfirmed_bookings" }
  | { kind: "free_slot"; when: BookingWhen }
  | { kind: "send_reminders"; when: BookingWhen }
  | { kind: "bookings"; when: BookingWhen }
  | { kind: "revenue_by_service"; period: RevenuePeriod }
  | { kind: "revenue"; period: RevenuePeriod }
  | { kind: "vehicles_for_sale"; query?: string | null }
  | { kind: "vehicle_fees" }
  | { kind: "vehicle_leads"; vehicleKind: VehicleKindFilter; stale: boolean; leadType: VehicleLeadFilter; query?: string | null }
  | { kind: "tasks"; scope: TaskScope }
  | { kind: "tasks_for_staff"; name: string }
  | { kind: "payment_reminders"; scope: "all" | "context" }
  | { kind: "customer_balance" }
  | { kind: "profit" }
  | { kind: "bottlenecks" }
  | { kind: "briefing" }
  | { kind: "staff_workload" }
  | { kind: "service_demand" }
  | { kind: "not_contacted" }
  | { kind: "unassigned" }
  | { kind: "missing_documents" }
  | { kind: "quotes" }
  | { kind: "draft_quote"; request: string }
  | { kind: "create_task"; request: string }
  | { kind: "create_customer"; request: string }
  | { kind: "create_job"; request: string }
  | { kind: "create_invoice"; request: string }
  | { kind: "revise_invoice"; request: string }
  | { kind: "update_customer"; request: string }
  | { kind: "update_case_status"; request: string }
  | { kind: "assign_case"; request: string }
  | { kind: "work_plan"; request: string }
  | { kind: "my_tasks" }
  | { kind: "completed_work" }
  | { kind: "sales_help"; request: string }
  | { kind: "draft_message"; request: string }
  | { kind: "daily_report"; reportKind: ReportKind }
  | { kind: "document_review"; query: string | null }
  | { kind: "duplicates"; query: string | null }
  | { kind: "customer_summary"; query: string | null }
  | { kind: "customer_search"; query: string }
  | { kind: "knowledge"; query: string }
  | { kind: "unknown"; query: string };

const WRITE_KINDS = new Set<BackofficeIntent["kind"]>([
  "send_reminders",
  "draft_quote",
  "create_task",
  "create_customer",
  "create_job",
  "create_invoice",
  "revise_invoice",
  "update_customer",
  "update_case_status",
  "assign_case",
  "work_plan",
  "payment_reminders",
]);

export function isWriteIntent(intent: BackofficeIntent): boolean {
  return WRITE_KINDS.has(intent.kind);
}

function periodOf(text: string): RevenuePeriod {
  if (/compare/.test(text) && /last month/.test(text)) return "compare";
  if (/last month/.test(text)) return "last_month";
  if (/this week|weekly/.test(text)) return "week";
  if (/\btoday\b|daily/.test(text)) return "today";
  return "this_month";
}

function whenOf(text: string): BookingWhen {
  return /\btoday\b/.test(text) ? "today" : "tomorrow";
}

export function classifyBackofficeIntent(raw: string): BackofficeIntent {
  const text = raw.replace(/\s+/g, " ").trim();
  const t = text.toLowerCase();
  if (!text) return { kind: "help" };
  if (/^(help|what can you do|capabilities)\b/.test(t)) return { kind: "help" };

  if (/\bprofit\b|\bmargin\b|operating cost/.test(t)) return { kind: "profit" };
  if (/getting delayed|getting stuck|bottleneck|where are bookings/.test(t)) return { kind: "bottlenecks" };
  if (/executive briefing|management briefing|business overview|daily briefing/.test(t)) return { kind: "briefing" };
  if (/haven'?t been contacted|not been contacted|haven't contacted/.test(t)) return { kind: "not_contacted" };
  if (/how much do they owe|what do they owe|their balance/.test(t)) return { kind: "customer_balance" };
  if (/payment reminder/.test(t) || (/remind/.test(t) && /(payment|outstanding|unpaid|balance)/.test(t))) {
    const all = /customers|everyone|all /.test(t) || /outstanding/.test(t);
    return { kind: "payment_reminders", scope: all ? "all" : "context" };
  }
  if (/most popular|requesting most|customers requesting/.test(t)) return { kind: "service_demand" };
  if (/staff workload|outstanding tasks|most overdue tasks|everyone'?s workload|team workload/.test(t)) return { kind: "staff_workload" };
  const assigned = text.match(/\bassigned to\s+([A-Za-z][A-Za-z.'-]{1,40})/i);
  if (assigned && /task/.test(t)) return { kind: "tasks_for_staff", name: assigned[1]!.replace(/\.$/, "") };

  if (/outstanding deposit|deposits outstanding|unpaid deposit/.test(t)) return { kind: "deposits" };
  if (/outstanding (customer )?payment|payments? (are|is) outstanding|owe us|who still owes|unpaid invoice|outstanding balance/.test(t)) {
    return { kind: "outstanding_payments" };
  }
  if (/licen[cs]e/.test(t) && /renew/.test(t)) {
    if (/overdue|expired/.test(t)) return { kind: "renewals", window: "overdue" };
    if (/next month/.test(t)) return { kind: "renewals", window: "next_month" };
    if (/this month|due this month/.test(t)) return { kind: "renewals", window: "this_month" };
    return { kind: "renewals", window: "soon" };
  }
  if (/haven'?t been confirmed|not been confirmed|unconfirmed|haven'?t confirmed/.test(t)) {
    return { kind: "unconfirmed_bookings" };
  }
  if (/quotation|quote/.test(t) && /haven'?t responded|no response|outstanding quotation|outstanding quote/.test(t)) {
    return { kind: "quotes" };
  }
  if (/create (a )?(new )?customer|add (a )?customer|new customer record/.test(t) && !/quot/.test(t) && !/\bjob\b/.test(t)) {
    return { kind: "create_customer", request: text };
  }
  const steps = detectWorkSteps(text);
  if (steps.length >= 2) return { kind: "work_plan", request: text };
  if (/create (an |a )?invoice|\binvoice for\b/.test(t) && !/unpaid|outstanding|show|remind/.test(t)) {
    return { kind: "create_invoice", request: text };
  }
  if (/invoice/.test(t) && /(change|edit|add|amount|discount)/.test(t)) {
    return { kind: "revise_invoice", request: text };
  }
  if (/update (the )?customer|change (the )?(customer )?(phone|email|name)|rename (the )?customer/.test(t)) {
    return { kind: "update_customer", request: text };
  }
  if (/(update|change|set|mark) (the )?(job|booking|case) status|mark (the )?(job|booking|case) as/.test(t)) {
    return { kind: "update_case_status", request: text };
  }
  if (/assign (this |the )?(job|booking|case)\b/.test(t)) {
    return { kind: "assign_case", request: text };
  }
  if (/create (?:a |the )?(?:new )?(?:customer )?(?:job|booking)|registration job/.test(t)) {
    return { kind: "create_job", request: text };
  }
  if (/prepar(e|ing) a quotation|draft (a )?quot|quotation for|quote for|create (a )?(customer )?quot/.test(t)) {
    return { kind: "draft_quote", request: text };
  }
  if (/create (a )?(follow-?up )?task|follow-?up task|assign a task|assign this customer follow-?up/.test(t)) {
    return { kind: "create_task", request: text };
  }
  if (/\bremind\s+[a-z]/.test(t) && /contact|customer|follow/.test(t)) {
    return { kind: "create_task", request: text };
  }
  if (/prepare .*message|draft a message|write a message|confirming tomorrow|message for a customer/.test(t)) {
    return { kind: "draft_message", request: text };
  }
  if (/free (appointment )?slot|available slot|find a slot/.test(t)) {
    return { kind: "free_slot", when: whenOf(t) };
  }
  if (/send (a )?reminder|remind everyone|reminder to everyone/.test(t)) {
    return { kind: "send_reminders", when: whenOf(t) };
  }
  if (/\btomorrow\b/.test(t) && /appointment|booking|schedule/.test(t) && !/message|confirming/.test(t)) {
    return { kind: "bookings", when: "tomorrow" };
  }
  if (/\btoday\b/.test(t) && /appointment|booking/.test(t)) {
    return { kind: "bookings", when: "today" };
  }
  if (/which services generated|most revenue|revenue by service|most money|make us the most/.test(t)) {
    return { kind: "revenue_by_service", period: periodOf(t) };
  }
  if (/compare this month/.test(t) && /revenue|last month/.test(t)) {
    return { kind: "revenue", period: "compare" };
  }
  if (/revenue|how much (did we|have we)|takings/.test(t)) {
    return { kind: "revenue", period: periodOf(t) };
  }
  if (/(listed for sale|vehicles currently listed|for sale)/.test(t) && /vehicle|car|motorcycle|listing/.test(t)) {
    return { kind: "vehicles_for_sale" };
  }
  if (/sourcing fee|vehicle fee|outstanding vehicle/.test(t)) return { kind: "vehicle_fees" };
  if (/motorcycle|motorbike/.test(t) && /customer|lead|sourcing|enquir|looking/.test(t)) {
    return {
      kind: "vehicle_leads",
      vehicleKind: "motorcycle",
      stale: /haven'?t been updated|not been updated|stale/.test(t),
      leadType: /\bsell/.test(t) ? "sell" : "buy",
    };
  }
  if (/vehicle sourcing|sourcing customer/.test(t)) {
    return {
      kind: "vehicle_leads",
      vehicleKind: null,
      stale: /haven'?t been updated|not been updated|stale/.test(t),
      leadType: "buy",
    };
  }
  if (/what do i need|my tasks|tasks for me|need to complete today/.test(t)) return { kind: "my_tasks" };
  if (/overdue (staff )?task|overdue work/.test(t)) return { kind: "tasks", scope: "overdue" };
  if (/without an assigned|no assigned staff|unassigned/.test(t)) return { kind: "unassigned" };
  if (/team needs|task list|today'?s tasks|complete today|need follow-?ups?/.test(t)) {
    return { kind: "tasks", scope: "today" };
  }
  if (/missing document|haven'?t sent their required|required documents/.test(t)) {
    return { kind: "missing_documents" };
  }
  if (/completed work|what was completed|finished today/.test(t)) return { kind: "completed_work" };
  if (/sales template|recommend (a |the )?(best )?response|customer objection|promotional message|translate (this |the )?(message|draft)/.test(t)) {
    return { kind: "sales_help", request: text };
  }
  if (/end of day|end-of-day|daily report|operations report|morning report|summarise today|summarize today/.test(t)) {
    return { kind: "daily_report", reportKind: /end of day|end-of-day/.test(t) ? "eod" : "morning" };
  }
  if (/compare (the )?documents|document check|mismatched|passport/.test(t)) {
    return { kind: "document_review", query: extractLooseQuery(text) };
  }
  if (/duplicate/.test(t)) return { kind: "duplicates", query: extractLooseQuery(text) };
  if (
    /customer (history|profile|summary)|summarise (this|the) customer|summarize (this|the) customer/.test(t) ||
    /\b(this|that|the same) customer\b/.test(t)
  ) {
    return { kind: "customer_summary", query: extractCustomerQuery(text) };
  }
  if (/find (?:a |all )?customers?|search customers|customer named|customers named|look up/.test(t)) {
    return { kind: "customer_search", query: extractCustomerQuery(text) ?? text };
  }
  if (/policy|how do we|procedure|faq|knowledge base|what documents/.test(t)) {
    return { kind: "knowledge", query: text };
  }
  return { kind: "unknown", query: text };
}

export function extractCustomerQuery(text: string): string | null {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) return email;
  const phone = text.match(/(?:\+?\d[\d\s-]{7,}\d)/)?.[0];
  if (phone) return phone.replace(/\s+/g, "");
  const quoted = text.match(/"([^"]{2,80})"|'([^']{2,80})'/);
  if (quoted) return (quoted[1] ?? quoted[2] ?? "").trim();
  const named = text.match(/\b(?:named|called)\s+([A-Za-z][\w .'-]{1,60})/i)?.[1];
  if (named) return named.trim();
  return null;
}

function extractLooseQuery(text: string): string | null {
  return extractCustomerQuery(text);
}

const CLASSIFIER_KINDS = [
  "help",
  "outstanding_payments",
  "deposits",
  "renewals",
  "unconfirmed_bookings",
  "free_slot",
  "send_reminders",
  "bookings",
  "revenue_by_service",
  "revenue",
  "vehicles_for_sale",
  "vehicle_fees",
  "vehicle_leads",
  "tasks",
  "tasks_for_staff",
  "payment_reminders",
  "customer_balance",
  "profit",
  "bottlenecks",
  "briefing",
  "staff_workload",
  "service_demand",
  "not_contacted",
  "unassigned",
  "missing_documents",
  "quotes",
  "draft_quote",
  "create_task",
  "create_customer",
  "create_job",
  "create_invoice",
  "revise_invoice",
  "update_customer",
  "update_case_status",
  "assign_case",
  "work_plan",
  "my_tasks",
  "completed_work",
  "sales_help",
  "draft_message",
  "daily_report",
  "document_review",
  "duplicates",
  "customer_summary",
  "customer_search",
  "knowledge",
  "unknown",
] as const;

export function parseClassifierJson(raw: unknown, staffMessage: string): BackofficeIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const kind = value.kind;
  if (typeof kind !== "string" || !(CLASSIFIER_KINDS as readonly string[]).includes(kind)) return null;
  const query = typeof value.query === "string" ? value.query.slice(0, 300) : null;
  switch (kind) {
    case "renewals": {
      const window = value.window;
      if (window !== "this_month" && window !== "next_month" && window !== "overdue" && window !== "soon") {
        return { kind: "renewals", window: "soon" };
      }
      return { kind: "renewals", window };
    }
    case "free_slot":
    case "send_reminders":
    case "bookings":
      return { kind, when: value.when === "today" ? "today" : "tomorrow" };
    case "revenue":
    case "revenue_by_service": {
      const period = value.period;
      const allowed: RevenuePeriod[] = ["today", "week", "this_month", "last_month", "compare"];
      return { kind, period: allowed.includes(period as RevenuePeriod) ? (period as RevenuePeriod) : "this_month" };
    }
    case "vehicle_leads":
      return {
        kind,
        vehicleKind: value.vehicleKind === "motorcycle" || value.vehicleKind === "car" ? value.vehicleKind : null,
        stale: value.stale === true,
        leadType: value.leadType === "sell" ? "sell" : "buy",
      };
    case "tasks":
      return { kind, scope: value.scope === "overdue" ? "overdue" : "today" };
    case "tasks_for_staff":
      return { kind, name: (query || "staff").slice(0, 40) };
    case "payment_reminders":
      return { kind, scope: value.scope === "context" ? "context" : "all" };
    case "customer_balance":
    case "profit":
    case "bottlenecks":
    case "briefing":
    case "staff_workload":
    case "service_demand":
    case "not_contacted":
      return { kind };
    case "daily_report":
      return { kind, reportKind: value.reportKind === "eod" ? "eod" : "morning" };
    case "draft_quote":
    case "create_task":
    case "create_customer":
    case "create_job":
    case "create_invoice":
    case "revise_invoice":
    case "update_customer":
    case "update_case_status":
    case "assign_case":
    case "work_plan":
    case "sales_help":
    case "draft_message":
      return { kind, request: staffMessage };
    case "my_tasks":
    case "completed_work":
      return { kind };
    case "document_review":
    case "duplicates":
    case "customer_summary":
      return { kind, query };
    case "customer_search":
    case "knowledge":
    case "unknown":
      return { kind, query: query || staffMessage };
    case "help":
    case "outstanding_payments":
    case "deposits":
    case "unconfirmed_bookings":
    case "unassigned":
    case "missing_documents":
    case "quotes":
    case "vehicle_fees":
    case "vehicles_for_sale":
      return { kind };
    default:
      return null;
  }
}

export const CLASSIFIER_INSTRUCTIONS = `Classify one SiamEZ staff request as JSON.
Allowed kind values: ${CLASSIFIER_KINDS.join(", ")}.
Use outstanding_payments, bookings, revenue, renewals, quotes, vehicle_leads, tasks, or customer_search when the request asks for records.
Use draft_quote, create_task, create_customer, create_job, create_invoice, revise_invoice, or send_reminders only when the staff member asks for that action.
Never invent a kind outside the list. Return only JSON with a kind field and optional window, when, period, query, vehicleKind, stale, leadType, scope, reportKind.`;
