import { describe, expect, it } from "vitest";
import {
  canTransitionRun,
  canTransitionStep,
  decideRunTransition,
  decideStepTransition,
  parseStepTarget,
  resolveStepTargetHref,
  runTimestampPatch,
  stepTimestampPatch,
  suggestRunStatusAfterSteps,
  summarizeStepStatuses,
} from "@/lib/life-events";
import {
  clampProgressPct,
  decideGoalTransition,
  goalTimestampPatch,
  progressPctForStatus,
  syncGoalPctFromLifeEvent,
} from "@/lib/goals";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

describe("life event step transitions", () => {
  it("allows pending → started → completed", () => {
    expect(decideStepTransition("pending", "started")).toEqual({
      ok: true,
      from: "pending",
      to: "started",
    });
    expect(decideStepTransition("started", "completed")).toEqual({
      ok: true,
      from: "started",
      to: "completed",
    });
    expect(canTransitionStep("pending", "completed")).toBe(true);
  });

  it("rejects same-status and illegal jumps are still gated by table", () => {
    expect(decideStepTransition("pending", "pending")).toEqual({
      ok: false,
      reason: "same_status",
    });
    // completed → skipped is not in the allow list
    expect(canTransitionStep("completed", "skipped")).toBe(false);
    expect(decideStepTransition("completed", "skipped")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });

  it("applies started/completed timestamps for step patches", () => {
    const now = new Date("2026-08-02T00:00:00.000Z");
    expect(stepTimestampPatch("started", now)).toEqual({
      startedAt: now,
      completedAt: null,
    });
    expect(stepTimestampPatch("completed", now)).toEqual({
      startedAt: now,
      completedAt: now,
    });
    expect(stepTimestampPatch("pending", now)).toEqual({
      startedAt: null,
      completedAt: null,
    });
  });
});

describe("life event run transitions + summary", () => {
  it("summarizes step statuses and percent", () => {
    const summary = summarizeStepStatuses([
      "completed",
      "completed",
      "started",
      "pending",
      "skipped",
    ]);
    expect(summary.total).toBe(5);
    expect(summary.completed).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.percent).toBe(60); // 3/5 done-like
    expect(summary.allDone).toBe(false);
  });

  it("suggests completed when all steps done-like", () => {
    const summary = summarizeStepStatuses(["completed", "skipped"]);
    expect(summary.allDone).toBe(true);
    expect(suggestRunStatusAfterSteps("active", summary)).toBe("completed");
  });

  it("allows active → completed / abandoned", () => {
    expect(canTransitionRun("active", "completed")).toBe(true);
    expect(decideRunTransition("active", "abandoned").ok).toBe(true);
    expect(decideRunTransition("completed", "abandoned").ok).toBe(false);
    const now = new Date("2026-08-02T12:00:00.000Z");
    expect(runTimestampPatch("completed", now)).toEqual({ completedAt: now });
    expect(runTimestampPatch("active", now)).toEqual({ completedAt: null });
  });
});

describe("life event step target URL contracts", () => {
  const vehicleId = "clxyz0123456789abcdefgh";
  const propertyId = "clprop9876543210zyxwvuts";

  it("parses flexible target JSON", () => {
    const target = parseStepTarget({
      serviceSlug: " driver-license ",
      listingType: "vehicle",
      listingId: vehicleId,
      listingFilters: { category: "motorcycle" },
    });
    expect(target.serviceSlug).toBe("driver-license");
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
    expect(vehicleHref).toBe(`/sales/${vehicleId}`);
    expect(propertyHref).toBe(`/real-estate/${propertyId}`);
    expect(vehicleHref).toBe(buildSalesListingPath(vehicleId));
    expect(propertyHref).toBe(buildRealEstateListingPath(propertyId));
    expect(vehicleHref).not.toContain("honda");
    expect(propertyHref).not.toContain("bangkok");
  });

  it("resolves service book path and marketplace directory filters", () => {
    expect(
      resolveStepTargetHref({ serviceSlug: "vehicle-registration" }, { preferBook: true })
    ).toBe("/book/vehicle-registration");
    expect(
      resolveStepTargetHref({
        listingType: "property",
        listingFilters: { listingType: "rent", province: "Bangkok" },
      })
    ).toBe("/real-estate?listingType=rent&province=Bangkok");
  });

  it("prefers explicit href override", () => {
    expect(
      resolveStepTargetHref({
        href: "/sales",
        serviceSlug: "driver-license",
        listingId: vehicleId,
        listingType: "vehicle",
      })
    ).toBe("/sales");
  });
});

describe("goal progress transitions", () => {
  it("allows active → completed and reopen", () => {
    expect(decideGoalTransition("active", "completed")).toEqual({
      ok: true,
      from: "active",
      to: "completed",
    });
    expect(decideGoalTransition("completed", "active").ok).toBe(true);
    expect(decideGoalTransition("active", "active")).toEqual({
      ok: false,
      reason: "same_status",
    });
  });

  it("clamps progress and snaps on complete", () => {
    expect(clampProgressPct(150)).toBe(100);
    expect(clampProgressPct(-5)).toBe(0);
    expect(progressPctForStatus("completed", 40)).toBe(100);
    expect(progressPctForStatus("active", 100)).toBe(0);
    expect(progressPctForStatus("active", 55)).toBe(55);
    expect(syncGoalPctFromLifeEvent(60)).toBe(60);
    expect(syncGoalPctFromLifeEvent(100)).toBe(100);
  });

  it("mirrors life-event step percent into goal progress", () => {
    const summary = summarizeStepStatuses([
      "completed",
      "completed",
      "started",
      "pending",
    ]);
    expect(syncGoalPctFromLifeEvent(summary.percent)).toBe(50);
  });

  it("sets completedAt on complete", () => {
    const now = new Date("2026-08-02T08:00:00.000Z");
    expect(goalTimestampPatch("completed", now)).toEqual({ completedAt: now });
    expect(goalTimestampPatch("active", now)).toEqual({ completedAt: null });
  });
});
