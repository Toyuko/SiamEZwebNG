import { describe, expect, it } from "vitest";
import {
  createJobIntakeMemoryToken,
  formatJobIntakeMemoryBrief,
  isJobIntakeMemoryToken,
  jobIntakeMemoryJson,
  originFromHeaders,
  sanitizeJobIntakeMemoryDetails,
  sanitizeJobIntakeMemoryNote,
} from "@/lib/jobs/intake-memory";

describe("job intake memory", () => {
  it("keeps a draft's details and drops unexpected fields", () => {
    const details = sanitizeJobIntakeMemoryDetails({
      customerName: "  John Smith  ",
      customerEmail: "John@Example.com",
      customerPhone: "+66 81 234 5678",
      leadSource: "line",
      closedByStaffId: "staff-grace",
      assignedStaffId: "tbd",
      scheduledDate: "2026-10-10",
      scheduledTime: "10:00",
      serviceId: "svc-license",
      jobDescription: "License conversion",
      totalPrice: "15000",
      depositAmount: "5000",
      location: "Bangkok",
      documents: ["Passport", "passport", "Thai address certificate"],
      createReceipt: false,
      customerChoice: "use_existing",
      existingCustomerId: "cust-1",
      password: "should-not-stick",
    });

    expect(details.customerName).toBe("John Smith");
    expect(details.customerEmail).toBe("john@example.com");
    expect(details.documents).toEqual(["Passport", "Thai address certificate"]);
    expect(details.createReceipt).toBe(false);
    expect(details).not.toHaveProperty("password");
  });

  it("falls back when a draft is incomplete", () => {
    const details = sanitizeJobIntakeMemoryDetails({ leadSource: "carrier-pigeon", scheduledDate: "tomorrow" });
    expect(details.leadSource).toBe("");
    expect(details.scheduledDate).toBe("");
    expect(details.assignedStaffId).toBe("tbd");
    expect(details.status).toBe("confirmed");
    expect(details.depositAmount).toBe("0");
  });

  it("caps the memory note", () => {
    expect(sanitizeJobIntakeMemoryNote(`  ${"a".repeat(9000)}  `)).toHaveLength(8000);
    expect(sanitizeJobIntakeMemoryNote(null)).toBe("");
  });

  it("issues an unguessable token", () => {
    const token = createJobIntakeMemoryToken();
    expect(isJobIntakeMemoryToken(token)).toBe(true);
    expect(isJobIntakeMemoryToken("short")).toBe(false);
  });

  it("writes a stable brief an agent can read from the saved URL", () => {
    const details = sanitizeJobIntakeMemoryDetails({
      customerName: "John Smith",
      customerEmail: "john@example.com",
      leadSource: "line",
      serviceId: "svc-license",
      totalPrice: "15000",
      jobDescription: "License conversion",
    });
    const brief = formatJobIntakeMemoryBrief({
      url: "https://siam-ez.com/en/jobs/saved/example-token-value",
      updatedAt: new Date("2026-10-08T13:00:00.000Z"),
      caseId: null,
      memory: "Customer wants the appointment kept in the morning.",
      details,
      services: [{ id: "svc-license", name: "Driver license" }],
      staff: [],
    });

    expect(brief).toContain("URL: https://siam-ez.com/en/jobs/saved/example-token-value");
    expect(brief).toContain("Confirmed job: not created yet");
    expect(brief).toContain("Customer wants the appointment kept in the morning.");
    expect(brief).toContain("Customer: John Smith");
    expect(brief).toContain("Service: Driver license");
    expect(brief).toContain("Total (THB): 15000");
  });

  it("uses the request host in the reference URL", () => {
    expect(originFromHeaders(new Headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(originFromHeaders(new Headers({ host: "siam-ez.com", "x-forwarded-proto": "https" }))).toBe(
      "https://siam-ez.com"
    );
  });

  it("escapes script tags in the embedded JSON", () => {
    expect(jobIntakeMemoryJson({ memory: "</script><script>alert(1)" })).not.toContain("</script>");
  });
});
