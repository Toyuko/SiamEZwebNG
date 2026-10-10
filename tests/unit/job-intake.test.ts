import { describe, expect, it } from "vitest";
import { intakeInvoiceToken, intakeInvoiceTokenMatches } from "@/lib/jobs/invoice-access";
import {
  CustomerChoiceRequiredError,
  JobIntakeValidationError,
  assertJobIntakeAccess,
  bangkokDateTime,
  buildJobCopyText,
  decideCustomer,
  formatSequentialInvoiceNumber,
  formatSequentialReceiptNumber,
  formatThb,
  isAssignableJobStaff,
  invoiceSequenceFromNumber,
  invoiceStatusForDeposit,
  jobMoneyReconciliation,
  nextInvoiceSequence,
  nextReceiptSequence,
  outstandingSatang,
  paymentStanding,
  phonesMatch,
  planCalendarEvent,
  receiptSequenceFromNumber,
  shouldIssueReceipt,
  validateJobIntake,
} from "@/lib/jobs/intake";

const base = {
  customerName: "John Smith",
  customerEmail: "john@example.com",
  customerPhone: "+66 81 234 5678",
  leadSource: "line",
  closedByStaffId: "staff-grace",
  assignedStaffId: "staff-grace",
  scheduledDate: "2026-10-10",
  scheduledTime: "10:00",
  serviceId: "svc-license",
  jobDescription: "License conversion",
  totalPrice: "15000",
  depositAmount: "5000",
  location: "Bangkok",
  documentsRequired: ["Passport", "Thai address certificate", "Foreign driver's license"],
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
};

describe("confirmed job intake", () => {
  it("validates a complete job and keeps money in satang", () => {
    const job = validateJobIntake(base);
    expect(job.customerEmail).toBe("john@example.com");
    expect(job.totalSatang).toBe(1_500_000);
    expect(job.depositSatang).toBe(500_000);
    expect(job.outstandingSatang).toBe(1_000_000);
    expect(job.serviceId).toBe("svc-license");
    expect(job.otherServiceName).toBeNull();
    expect(job.assignedStaffId).toBe("staff-grace");
    expect(job.closedByStaffId).toBe("staff-grace");
    expect(job.scheduledAt?.toISOString()).toBe("2026-10-10T03:00:00.000Z");
  });

  it("requires name, email, source, closer, job type, and price", () => {
    expect(() =>
      validateJobIntake({
        ...base,
        customerName: " ",
        customerEmail: "not-an-email",
        leadSource: "",
        closedByStaffId: "",
        serviceId: "",
        otherServiceName: "",
        totalPrice: "",
      })
    ).toThrow(JobIntakeValidationError);
  });

  it("rejects a deposit above the total and negative amounts", () => {
    try {
      validateJobIntake({ ...base, depositAmount: "16000" });
      throw new Error("expected deposit rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(JobIntakeValidationError);
      expect((error as JobIntakeValidationError).fieldErrors.depositAmount).toMatch(/exceed/);
    }
    expect(() => validateJobIntake({ ...base, totalPrice: "-1" })).toThrow(JobIntakeValidationError);
    expect(outstandingSatang(1_500_000, 500_000)).toBe(1_000_000);
  });

  it("reuses an email match and does not merge a different phone match", () => {
    const emailCustomer = { id: "cust-1", name: "John Smith", email: "john@example.com", phone: null };
    const phoneCustomer = { id: "cust-2", name: "Other", email: "other@example.com", phone: "+66812345678" };
    const decision = decideCustomer({
      emailMatch: emailCustomer,
      phoneMatches: [phoneCustomer],
      choice: null,
      existingCustomerId: null,
    });
    expect(decision).toEqual({ action: "reuse", userId: "cust-1", customer: emailCustomer });
  });

  it("asks before using a phone-only match, and can create a new customer", () => {
    const phoneCustomer = { id: "cust-2", name: "Jane", email: "jane@example.com", phone: "0812345678" };
    expect(phonesMatch("+66 81 234 5678", "0812345678")).toBe(true);
    const needsChoice = decideCustomer({
      emailMatch: null,
      phoneMatches: [phoneCustomer],
      choice: null,
      existingCustomerId: null,
    });
    expect(needsChoice.action).toBe("needs_choice");
    const created = decideCustomer({
      emailMatch: null,
      phoneMatches: [phoneCustomer],
      choice: "create_new",
      existingCustomerId: null,
    });
    expect(created.action).toBe("create");
    const reused = decideCustomer({
      emailMatch: null,
      phoneMatches: [phoneCustomer],
      choice: "use_existing",
      existingCustomerId: "cust-2",
    });
    expect(reused).toMatchObject({ action: "reuse", userId: "cust-2" });
  });

  it("creates a new customer when nothing matches", () => {
    expect(
      decideCustomer({ emailMatch: null, phoneMatches: [], choice: null, existingCustomerId: null }).action
    ).toBe("create");
  });

  it("keeps other job types out of the service catalog", () => {
    const job = validateJobIntake({
      ...base,
      serviceId: "other",
      otherServiceName: "Thai Driver's License",
    });
    expect(job.serviceId).toBeNull();
    expect(job.otherServiceName).toBe("Thai Driver's License");
  });

  it("allows the closer and the assigned staff to be different people", () => {
    const job = validateJobIntake({
      ...base,
      closedByStaffId: "grace",
      assignedStaffId: "cee",
    });
    expect(job.closedByStaffId).toBe("grace");
    expect(job.assignedStaffId).toBe("cee");
    const tbd = validateJobIntake({ ...base, assignedStaffId: "tbd" });
    expect(tbd.assignedStaffId).toBeNull();
  });

  it("does not count the full contract as cash collected", () => {
    const money = jobMoneyReconciliation(1_500_000, 500_000);
    expect(money).toEqual({
      contractValue: 1_500_000,
      paid: 500_000,
      outstanding: 1_000_000,
      countsFullAmountAsCash: false,
    });
    expect(formatThb(money.contractValue)).toBe("฿15,000");
    expect(invoiceStatusForDeposit(1_500_000, 500_000)).toBe("unpaid");
    expect(invoiceStatusForDeposit(1_500_000, 1_500_000)).toBe("paid");
    expect(paymentStanding(1_500_000, 500_000)).toBe("partial");
  });

  it("allocates sequential invoice numbers and ignores other years", () => {
    expect(formatSequentialInvoiceNumber(2026, 1)).toBe("INV-2026-00001");
    expect(nextInvoiceSequence(["INV-2026-00001", "INV-2026-00002", "INV-2025-00009"], 2026)).toBe(3);
    expect(invoiceSequenceFromNumber("INV-2026-00002", 2026)).toBe(2);
    expect(formatSequentialInvoiceNumber(2026, 3)).not.toBe(formatSequentialInvoiceNumber(2026, 2));
  });

  it("allocates a receipt only when money was received and the option is on", () => {
    expect(formatSequentialReceiptNumber(2026, 1)).toBe("RCP-2026-00001");
    expect(nextReceiptSequence(["RCP-2026-00001", "INV-2026-00009", "RCP-2025-00004"], 2026)).toBe(2);
    expect(receiptSequenceFromNumber("RCP-2026-00007", 2026)).toBe(7);
    expect(shouldIssueReceipt(true, 500_000)).toBe(true);
    expect(shouldIssueReceipt(true, 0)).toBe(false);
    expect(shouldIssueReceipt(false, 500_000)).toBe(false);
    expect(validateJobIntake({ ...base, createReceipt: true }).createReceipt).toBe(true);
    expect(validateJobIntake(base).createReceipt).toBe(false);
  });

  it("plans one calendar event for a confirmed time and none when the date is missing", () => {
    const scheduled = planCalendarEvent({
      customerName: "John Smith",
      jobType: "Thai Driver's License",
      staffName: "Grace",
      location: "Bangkok",
      status: "confirmed",
      scheduledAt: bangkokDateTime("2026-10-10", "10:00"),
      timeTbd: false,
    });
    expect(scheduled.action).toBe("upsert");
    if (scheduled.action === "upsert") {
      expect(scheduled.allDay).toBe(false);
      expect(scheduled.title).toContain("John Smith");
      expect(scheduled.description).toContain("Grace");
    }
    expect(
      planCalendarEvent({
        customerName: "John Smith",
        jobType: "Visa",
        staffName: "Grace",
        location: null,
        status: "confirmed",
        scheduledAt: null,
        timeTbd: true,
      }).action
    ).toBe("none");
    expect(
      planCalendarEvent({
        customerName: "Michael Brown",
        jobType: "Visa",
        staffName: "Grace",
        location: "Bangkok",
        status: "cancelled",
        scheduledAt: bangkokDateTime("2026-10-10", "10:00"),
        timeTbd: false,
      }).action
    ).toBe("none");
  });

  it("builds copy text from the saved job fields", () => {
    const text = buildJobCopyText({
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerPhone: "+66 81 234 5678",
      leadSource: "line",
      leadSourceDetail: null,
      staffName: "Grace",
      scheduledAt: bangkokDateTime("2026-10-10", "10:00"),
      timeTbd: false,
      jobType: "Thai Driver's License",
      jobDescription: "License conversion",
      totalSatang: 1_500_000,
      depositSatang: 500_000,
      outstandingSatang: 1_000_000,
      location: "Bangkok",
      documents: ["Passport", "Thai address certificate", "Foreign driver's license"],
      invoiceNumber: "INV-2026-00042",
    });
    expect(text).toBe(
      [
        "Customer information",
        "Name: John Smith",
        "Email: john@example.com",
        "Phone: +66 81 234 5678",
        "Source: LINE",
        "",
        "Staff and Scheduling information",
        "Staff: Grace",
        "Date: 10 October 2026",
        "Time: 10:00 AM",
        "",
        "Service Information",
        "Job Type: Thai Driver's License",
        "Job description: License conversion",
        "Total Price: ฿15,000",
        "Deposit amount: ฿5,000",
        "Outstanding Balance: ฿10,000",
        "Location: Bangkok",
        "",
        "Documents to be prepared:",
        "",
        "* Passport",
        "* Thai address certificate",
        "* Foreign driver's license",
        "",
        "Invoice: INV-2026-00042",
      ].join("\n")
    );
    expect(
      buildJobCopyText({
        customerName: "John Smith",
        customerEmail: "john@example.com",
        customerPhone: null,
        leadSource: "line",
        leadSourceDetail: null,
        staffName: "Grace",
        scheduledAt: null,
        timeTbd: true,
        jobType: "Visa",
        jobDescription: null,
        totalSatang: 100,
        depositSatang: 100,
        outstandingSatang: 0,
        location: null,
        documents: [],
        invoiceNumber: "INV-2026-00001",
        receiptNumber: "RCP-2026-00001",
      })
    ).toContain("Receipt: RCP-2026-00001");
  });

  it("refuses customers and other non-staff roles", () => {
    expect(() => assertJobIntakeAccess("customer")).toThrow("Unauthorized");
    expect(() => assertJobIntakeAccess(null)).toThrow("Unauthorized");
    expect(() => assertJobIntakeAccess("staff")).not.toThrow();
    expect(() => assertJobIntakeAccess("admin")).not.toThrow();
  });

  it("requires a fresh idempotency key so a double tap can be rejected server-side", () => {
    expect(() => validateJobIntake({ ...base, idempotencyKey: "" })).toThrow(JobIntakeValidationError);
    expect(() => validateJobIntake({ ...base, idempotencyKey: "repeat" })).toThrow(JobIntakeValidationError);
    const again = validateJobIntake(base);
    expect(again.idempotencyKey).toBe(base.idempotencyKey);
  });

  it("edits the same fields without creating a new submission key", () => {
    const edited = validateJobIntake(
      { ...base, totalPrice: "18000", depositAmount: "6000", idempotencyKey: null },
      { requireIdempotencyKey: false }
    );
    expect(edited.totalSatang).toBe(1_800_000);
    expect(edited.outstandingSatang).toBe(1_200_000);
    expect(edited.idempotencyKey).toBeNull();
  });

  it("signs an invoice link that does not open a different invoice", () => {
    const secret = "test-secret";
    const token = intakeInvoiceToken("inv_1", secret);
    expect(intakeInvoiceTokenMatches("inv_1", token, secret)).toBe(true);
    expect(intakeInvoiceTokenMatches("inv_2", token, secret)).toBe(false);
    expect(intakeInvoiceTokenMatches("inv_1", token, "other-secret")).toBe(false);
    expect(intakeInvoiceTokenMatches("inv_1", "short", secret)).toBe(false);
  });

  it("keeps real staff on the job form and leaves system accounts off it", () => {
    expect(isAssignableJobStaff({ name: "Grace", email: "grace@siamez.com" })).toBe(true);
    expect(isAssignableJobStaff({ name: "Bay", email: "hengruaycharoen168@gmail.com" })).toBe(true);
    expect(isAssignableJobStaff({ name: "Google Play Review Admin", email: "play-review-admin@siamez.com" })).toBe(false);
    expect(isAssignableJobStaff({ name: "SiamEZ Inquiries", email: "inquiries@siam-ez.com" })).toBe(false);
    expect(isAssignableJobStaff({ name: "Legacy migration", email: "migration-bot@siamez.internal" })).toBe(false);
  });

  it("surfaces a customer choice error instead of merging uncertain matches", () => {
    const error = new CustomerChoiceRequiredError([
      { id: "a", name: "A", email: "a@example.com", phone: "0811111111" },
    ]);
    expect(error.candidates).toHaveLength(1);
  });
});
