import { describe, expect, it } from "vitest";
import { classifyBackofficeIntent } from "@/lib/backoffice/intent";
import { describeProfit, namedMonthRange, rankByAmount } from "@/lib/backoffice/intelligence";
import { canViewManagementFinancials } from "@/lib/backoffice/permissions";
import { bookingWorkflowKey, planBookingWorkflow, stageForCaseStatus } from "@/lib/backoffice/workflow-plan";

describe("workflow plans", () => {
  it("builds a driving-licence checklist and keeps an existing one", () => {
    const planned = planBookingWorkflow({
      serviceName: "Motorcycle driving licence",
      customerName: "Malee",
      uploaded: [{ name: "Malee passport.pdf", documentType: "passport" }],
    });
    expect(planned.serviceKey).toBe("driving_licence");
    expect(planned.missing).not.toContain("Passport");
    expect(planned.missing).toContain("Medical certificate");
    expect(planned.customerMessage).toContain("has not been sent");

    const kept = planBookingWorkflow({
      serviceName: "Driver's License",
      customerName: "Malee",
      uploaded: [],
      storedChecklist: ["passport", "visa"],
    });
    expect(kept.checklist).toEqual(["passport", "visa"]);
    expect(kept.missing).toEqual(["passport", "visa"]);
  });

  it("uses a different checklist for marriage, police clearance, translation, and vehicles", () => {
    expect(planBookingWorkflow({ serviceName: "Marriage registration", customerName: "A", uploaded: [] }).serviceKey).toBe("marriage_registration");
    expect(planBookingWorkflow({ serviceName: "Police clearance", customerName: "A", uploaded: [] }).checklist).toContain("Residence certificate");
    expect(planBookingWorkflow({ serviceName: "Certified translation", customerName: "A", uploaded: [] }).checklist).toContain("Original document");
    expect(planBookingWorkflow({ serviceName: "Vehicle registration", customerName: "A", uploaded: [] }).serviceKey).toBe("vehicle_registration");
    expect(stageForCaseStatus("pending_docs")).toBe("Documents requested");
    expect(bookingWorkflowKey("case_1")).toBe("booking_created:case_1");
  });
});

describe("management questions", () => {
  it("maps owner questions onto live reports", () => {
    expect(classifyBackofficeIntent("How much revenue did we make this month?").kind).toBe("revenue");
    expect(classifyBackofficeIntent("Which services make us the most money?").kind).toBe("revenue_by_service");
    expect(classifyBackofficeIntent("Which staff have outstanding tasks?").kind).toBe("staff_workload");
    expect(classifyBackofficeIntent("Which customers haven't been contacted?").kind).toBe("not_contacted");
    expect(classifyBackofficeIntent("Where are bookings getting delayed?").kind).toBe("bottlenecks");
    expect(classifyBackofficeIntent("How many payments are outstanding?").kind).toBe("outstanding_payments");
    expect(classifyBackofficeIntent("Which services are most popular?").kind).toBe("service_demand");
  });
});

describe("management figures", () => {
  it("refuses profit to staff without substituting a number", () => {
    expect(canViewManagementFinancials("staff")).toBe(false);
    const refused = describeProfit({
      role: "staff",
      label: "this month",
      revenueSatang: 3225000,
      costSatang: 100,
      costCount: 1,
      commissionSatang: 50,
      commissionCount: 1,
    });
    expect([refused.title, ...refused.lines].join(" ")).not.toMatch(/\d/);
  });

  it("does not treat revenue as profit when costs are missing", () => {
    const report = describeProfit({
      role: "admin",
      label: "this month",
      revenueSatang: 3225000,
      costSatang: 0,
      costCount: 0,
      commissionSatang: 0,
      commissionCount: 0,
    });
    expect(report.lines.join(" ")).toContain("Profit cannot be calculated");
  });

  it("ranks recorded amounts", () => {
    expect(rankByAmount([{ name: "Licence", amount: 2 }, { name: "Marriage", amount: 5 }, { name: "Licence", amount: 4 }])).toEqual([
      { name: "Licence", amount: 6 },
      { name: "Marriage", amount: 5 },
    ]);
    expect(namedMonthRange("October", new Date("2026-11-04T05:00:00+07:00"))?.label).toBe("October 2026");
  });
});
