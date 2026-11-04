import { describe, expect, it } from "vitest";
import { classifyBackofficeIntent } from "@/lib/backoffice/intent";
import { parseAssigneeName } from "@/lib/backoffice/parse";
import {
  applyDiscount,
  detectWorkSteps,
  discountDecision,
  invoiceChangeMode,
  parseBahtSatang,
  parseCaseStatus,
  parseCustomerEdits,
  serviceNeedle,
} from "@/lib/backoffice/operations";
import { assertProviderUrl, openSecret, sealSecret, toPublicProvider } from "@/lib/backoffice/provider-seal";
import { fillTemplate, recommendTemplate, translationKeepsFacts } from "@/lib/backoffice/sales-templates";

describe("staff requests", () => {
  it("keeps a compound request as one plan", () => {
    const intent = classifyBackofficeIntent("Create a job for this customer, prepare their invoice, assign it to Grace and draft a message explaining the next steps.");
    expect(intent.kind).toBe("work_plan");
    expect(detectWorkSteps("Create a job for this customer, prepare their invoice, assign it to Grace and draft a message explaining the next steps.")).toEqual(["job", "invoice", "assign", "message"]);
  });

  it("understands jobs, invoices, and staff work", () => {
    expect(classifyBackofficeIntent("Create a new marriage registration job for this customer.").kind).toBe("create_job");
    expect(classifyBackofficeIntent("Create an invoice for this customer for ฿15,000.").kind).toBe("create_invoice");
    expect(classifyBackofficeIntent("Add a translation service to this invoice.").kind).toBe("revise_invoice");
    expect(classifyBackofficeIntent("Change the invoice amount to ฿20,000.").kind).toBe("revise_invoice");
    expect(classifyBackofficeIntent("Show me unpaid invoices.").kind).toBe("outstanding_payments");
    expect(classifyBackofficeIntent("Prepare a payment reminder.").kind).toBe("payment_reminders");
    expect(classifyBackofficeIntent("Assign this job to Grace.").kind).toBe("assign_case");
    expect(classifyBackofficeIntent("Assign a task to Grace.").kind).toBe("create_task");
    expect(parseAssigneeName("Remind Jun to contact this customer.")).toBe("Jun");
    expect(classifyBackofficeIntent("What do I need to complete today?").kind).toBe("my_tasks");
    expect(classifyBackofficeIntent("Show me everyone's workload.").kind).toBe("staff_workload");
    expect(classifyBackofficeIntent("Summarise today's completed work.").kind).toBe("completed_work");
    expect(classifyBackofficeIntent("Create a customer quotation.").kind).toBe("draft_quote");
  });
});

describe("money rules", () => {
  it("reads baht and refuses a staff discount", () => {
    expect(parseBahtSatang("Create an invoice for ฿15,000.")).toBe(1_500_000);
    expect(parseBahtSatang("Change the invoice amount to ฿20,000.")).toBe(2_000_000);
    expect(serviceNeedle("marriage registration")?.test("marriage registration")).toBe(true);
    expect(serviceNeedle("marriage registration")?.test("vehicle registration")).toBe(false);
    expect(discountDecision("staff", { kind: "percent", percent: 10 })).toBe("refuse");
    expect(discountDecision("admin", { kind: "percent", percent: 10 })).toBe("apply");
    expect(applyDiscount(1_500_000, { kind: "percent", percent: 10 })).toBe(1_350_000);
    expect(invoiceChangeMode("draft")).toBe("update_draft");
    expect(invoiceChangeMode("unpaid")).toBe("replacement_draft");
    expect(invoiceChangeMode("paid")).toBe("replacement_draft");
    expect(parseCaseStatus("Mark the job as completed")).toBe("completed");
    expect(parseCustomerEdits("Change the email to ada@example.com")).toEqual({ email: "ada@example.com" });
  });
});

describe("models and templates", () => {
  it("keeps keys sealed and templates free of invented prices", () => {
    const sealed = sealSecret("sk-test", "test-secret");
    expect(sealed.includes("sk-test")).toBe(false);
    expect(openSecret(sealed, "test-secret")).toBe("sk-test");
    expect(openSecret(sealed, "other-secret")).toBeNull();
    expect(toPublicProvider({ id: "1", label: "OpenAI", preset: "openai", baseUrl: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", sealedKey: sealed, enabled: true }).hasKey).toBe(true);
    expect(assertProviderUrl("https://api.deepseek.com/chat/completions")).toContain("deepseek");
    expect(assertProviderUrl("http://127.0.0.1:11434/v1/chat/completions")).toContain("127.0.0.1");
    expect(() => assertProviderUrl("http://example.com/v1/chat/completions")).toThrow();
    const draft = fillTemplate(recommendTemplate("missing documents").body, { name: "Ada", service: "", caseNumber: "SE-1", amount: "" });
    expect(draft).toContain("Ada");
    expect(draft).not.toMatch(/฿\d/);
    expect(translationKeepsFacts("The price is ฿15,000.", "ราคา 15,000")).toBe(true);
    expect(translationKeepsFacts("The price is ฿15,000.", "ราคาพิเศษ 9,000")).toBe(false);
  });
});
