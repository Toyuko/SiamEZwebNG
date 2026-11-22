import { describe, expect, it } from "vitest";
import {
  deriveWorkActions,
  isWorkCenterTab,
  workCenterTabWhere,
  workStatusTone,
} from "@/lib/admin/work-center";

describe("work-center helpers", () => {
  it("recognizes known tabs", () => {
    expect(isWorkCenterTab("needs_action")).toBe(true);
    expect(isWorkCenterTab("bogus")).toBe(false);
  });

  it("maps awaiting payment tab to payment statuses", () => {
    const where = workCenterTabWhere("awaiting_payment");
    expect(where).toEqual({
      status: {
        in: ["awaiting_payment", "awaiting_initial_payment", "milestone_due"],
      },
    });
  });

  it("derives actionable hints for unassigned overdue payment work", () => {
    const actions = deriveWorkActions({
      status: "awaiting_payment",
      assignedStaffId: null,
      scheduledAt: null,
      outstandingSatang: 350000,
      paymentStatus: "unpaid",
      documentsRequired: [],
      now: new Date("2026-11-22T00:00:00.000Z"),
    });
    const labels = actions.map((a) => a.label);
    expect(labels).toContain("Assign staff");
    expect(labels.some((l) => l.includes("Payment outstanding"))).toBe(true);
  });

  it("flags overdue appointments", () => {
    const actions = deriveWorkActions({
      status: "in_progress",
      assignedStaffId: "staff-1",
      scheduledAt: "2026-01-01T00:00:00.000Z",
      outstandingSatang: 0,
      paymentStatus: "paid",
      documentsRequired: [],
      now: new Date("2026-11-22T00:00:00.000Z"),
    });
    expect(actions.some((a) => a.code === "overdue")).toBe(true);
  });

  it("uses accessible status tones", () => {
    expect(workStatusTone("completed")).toBe("green");
    expect(workStatusTone("awaiting_payment")).toBe("yellow");
    expect(workStatusTone("in_progress")).toBe("blue");
    expect(workStatusTone("cancelled")).toBe("grey");
    expect(workStatusTone("refund_pending")).toBe("red");
  });
});
