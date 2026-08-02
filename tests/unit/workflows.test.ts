import { describe, expect, it } from "vitest";
import {
  canTransitionStep,
  computeNextSteps,
  decideAdvanceStep,
  decideRunTransition,
  decideStaffApprove,
  decideStaffReject,
  decideStepTransition,
  findActiveStepIndex,
  parseStepTarget,
  resolveStepTargetHref,
  runTimestampPatch,
  stepTimestampPatch,
  suggestRunStatusAfterSteps,
  summarizeStepStatuses,
} from "@/lib/workflows";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

describe("workflow step transitions", () => {
  it("allows pending → in_progress → completed", () => {
    expect(decideStepTransition("pending", "in_progress")).toEqual({
      ok: true,
      from: "pending",
      to: "in_progress",
    });
    expect(decideAdvanceStep({
      current: "pending",
      requiresApproval: false,
      runStatus: "active",
    }).ok).toBe(true);
    expect(
      decideAdvanceStep({
        current: "in_progress",
        requiresApproval: false,
        runStatus: "active",
      })
    ).toEqual({ ok: true, from: "in_progress", to: "completed" });
  });

  it("gates advance behind staff approval when required", () => {
    expect(
      decideAdvanceStep({
        current: "in_progress",
        requiresApproval: true,
        runStatus: "active",
      })
    ).toEqual({ ok: true, from: "in_progress", to: "awaiting_approval" });

    expect(
      decideAdvanceStep({
        current: "awaiting_approval",
        requiresApproval: true,
        runStatus: "active",
      })
    ).toEqual({ ok: false, reason: "requires_approval" });

    expect(
      decideStaffApprove({
        current: "awaiting_approval",
        runStatus: "active",
      })
    ).toEqual({ ok: true, from: "awaiting_approval", to: "approved" });

    expect(
      decideStaffReject({
        current: "in_progress",
        runStatus: "active",
      })
    ).toEqual({ ok: false, reason: "not_awaiting_approval" });

    expect(
      decideAdvanceStep({
        current: "rejected",
        requiresApproval: true,
        runStatus: "active",
      })
    ).toEqual({ ok: true, from: "rejected", to: "in_progress" });
  });

  it("rejects same-status and illegal jumps", () => {
    expect(decideStepTransition("pending", "pending")).toEqual({
      ok: false,
      reason: "same_status",
    });
    expect(canTransitionStep("completed", "awaiting_approval")).toBe(false);
  });

  it("applies timestamp patches", () => {
    const now = new Date("2026-08-02T00:00:00.000Z");
    expect(stepTimestampPatch("awaiting_approval", now)).toEqual({ startedAt: now });
    expect(stepTimestampPatch("approved", now)).toEqual({
      approvedAt: now,
      rejectedAt: null,
    });
    expect(stepTimestampPatch("rejected", now)).toEqual({
      rejectedAt: now,
      approvedAt: null,
    });
  });
});

describe("workflow run transitions + summary", () => {
  it("summarizes step statuses including approval queues", () => {
    const summary = summarizeStepStatuses([
      "completed",
      "awaiting_approval",
      "pending",
      "rejected",
    ]);
    expect(summary.total).toBe(4);
    expect(summary.completed).toBe(1);
    expect(summary.awaitingApproval).toBe(1);
    expect(summary.rejected).toBe(1);
    expect(summary.allDone).toBe(false);
  });

  it("suggests completed when all steps done-like", () => {
    const summary = summarizeStepStatuses(["completed", "skipped"]);
    expect(summary.allDone).toBe(true);
    expect(suggestRunStatusAfterSteps("active", summary)).toBe("completed");
  });

  it("allows active → completed / cancelled", () => {
    expect(decideRunTransition("active", "completed").ok).toBe(true);
    expect(decideRunTransition("active", "cancelled").ok).toBe(true);
    expect(decideRunTransition("completed", "cancelled").ok).toBe(false);
    const now = new Date("2026-08-02T12:00:00.000Z");
    expect(runTimestampPatch("completed", now)).toEqual({ completedAt: now });
  });

  it("finds the first non-terminal step", () => {
    expect(findActiveStepIndex(["completed", "in_progress", "pending"])).toBe(1);
    expect(findActiveStepIndex(["completed", "skipped"])).toBe(-1);
  });
});

describe("workflow step target URL contracts", () => {
  const vehicleId = "clxyz0123456789abcdefgh";
  const propertyId = "clprop9876543210zyxwvuts";

  it("parses flexible target JSON", () => {
    const target = parseStepTarget({
      serviceSlug: " vehicle-registration ",
      listingType: "vehicle",
      listingId: vehicleId,
      listingFilters: { category: "motorcycle" },
    });
    expect(target.serviceSlug).toBe("vehicle-registration");
    expect(target.listingId).toBe(vehicleId);
    expect(target.listingFilters?.category).toBe("motorcycle");
  });

  it("resolves listing deep links with cuid, never slug", () => {
    const vehicleHref = resolveStepTargetHref({
      listingType: "vehicle",
      listingId: vehicleId,
    });
    const propertyHref = resolveStepTargetHref({
      listingType: "property",
      listingId: propertyId,
    });
    expect(vehicleHref).toBe(buildSalesListingPath(vehicleId));
    expect(propertyHref).toBe(buildRealEstateListingPath(propertyId));
    expect(vehicleHref).toBe(`/sales/${vehicleId}`);
    expect(propertyHref).toBe(`/real-estate/${propertyId}`);
    expect(vehicleHref).not.toContain("slug");
  });

  it("prefers book path for booking steps", () => {
    const href = resolveStepTargetHref(
      { serviceSlug: "real-estate-services" },
      { preferBook: true }
    );
    expect(href).toBe("/book/real-estate-services");
  });
});

describe("workflow next-steps (deterministic)", () => {
  it("surfaces the active step and awaiting approval", () => {
    const next = computeNextSteps(
      [
        {
          stepRunId: "s1",
          templateStepId: "t1",
          titleEn: "Browse",
          titleTh: null,
          status: "completed",
          kind: "action",
          requiresApproval: false,
          target: { listingType: "vehicle" },
          sortOrder: 1,
        },
        {
          stepRunId: "s2",
          templateStepId: "t2",
          titleEn: "Book",
          titleTh: null,
          status: "awaiting_approval",
          kind: "booking",
          requiresApproval: true,
          target: { serviceSlug: "vehicle-registration" },
          sortOrder: 2,
        },
        {
          stepRunId: "s3",
          templateStepId: "t3",
          titleEn: "Done gate",
          titleTh: null,
          status: "pending",
          kind: "approval",
          requiresApproval: true,
          target: {},
          sortOrder: 3,
        },
      ],
      { runStatus: "active", preferBook: true }
    );
    expect(next.length).toBeGreaterThanOrEqual(1);
    expect(next[0]?.stepRunId).toBe("s2");
    expect(next[0]?.href).toBe("/book/vehicle-registration");
    expect(next[0]?.reason).toMatch(/approval/i);
  });
});
