import { describe, expect, it } from "vitest";
import {
  assertCaseStatusTransition,
  canTransitionCaseStatus,
} from "@/lib/domain/case-status";
import { isStaffRole } from "@/lib/auth/roles";

describe("case status transitions", () => {
  it("allows known staff transitions", () => {
    expect(canTransitionCaseStatus("new", "under_review")).toBe(true);
    expect(canTransitionCaseStatus("awaiting_payment", "paid")).toBe(true);
    expect(canTransitionCaseStatus("paid", "in_progress")).toBe(true);
  });

  it("rejects illegal jumps such as new → completed", () => {
    expect(canTransitionCaseStatus("new", "completed")).toBe(false);
    expect(() => assertCaseStatusTransition("new", "completed")).toThrow(
      /Invalid status transition/
    );
  });

  it("allows no-op same-status updates", () => {
    expect(canTransitionCaseStatus("in_progress", "in_progress")).toBe(true);
  });
});

describe("isStaffRole", () => {
  it("recognizes admin and staff only", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("staff")).toBe(true);
    expect(isStaffRole("customer")).toBe(false);
    expect(isStaffRole("freelancer")).toBe(false);
  });
});
