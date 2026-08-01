import { describe, expect, it } from "vitest";
import { summarizeCase } from "@/lib/admin/case-summary";

describe("summarizeCase", () => {
  it("builds headline and attention for an unassigned new case", () => {
    const result = summarizeCase({
      caseNumber: "SE-2026-00001",
      status: "new",
      serviceName: "Marriage registration",
      clientName: "Alex Guest",
      clientEmail: "alex@example.com",
      isGuest: true,
      documentCount: 0,
      noteCount: 0,
      invoiceCount: 0,
      paymentCount: 0,
      quoteCount: 0,
      eventCount: 0,
      staffNames: [],
      locale: "en",
    });

    expect(result.headline).toContain("SE-2026-00001");
    expect(result.headline).toContain("Marriage registration");
    expect(result.bullets.some((b) => b.includes("guest"))).toBe(true);
    expect(result.attention.length).toBeGreaterThan(0);
    expect(result.attention.some((a) => /staff/i.test(a))).toBe(true);
    expect(result.attention.some((a) => /document/i.test(a))).toBe(true);
  });

  it("supports Thai locale copy", () => {
    const result = summarizeCase({
      caseNumber: "SE-2026-00002",
      status: "awaiting_payment",
      serviceName: "Visa",
      clientName: "Somchai",
      documentCount: 2,
      noteCount: 1,
      invoiceCount: 0,
      paymentCount: 0,
      quoteCount: 1,
      eventCount: 1,
      staffNames: ["Admin"],
      locale: "th",
    });

    expect(result.headline).toContain("รอชำระเงิน");
    expect(result.attention.some((a) => a.includes("ใบแจ้งหนี้"))).toBe(true);
  });
});
