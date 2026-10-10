import { describe, expect, it } from "vitest";
import { assertJobIntakeAccess } from "@/lib/jobs/intake";
import { detectProvince, provinceStyle, suggestedProvince, THAI_PROVINCE_NAMES } from "@/lib/calendar/provinces";
import {
  calendarRange,
  calendarSummary,
  eventCoversDate,
  filterCalendarJobs,
  manualEventWindow,
  matchesProvince,
  movedManualEvent,
  normalizeManualPlace,
  isUnscheduledJob,
  monthGridDates,
  parseCalendarView,
  parseProvinceParam,
  planBackfill,
  preferredCalendarView,
  resolveCalendarView,
  reschedulePlan,
  schedulingWarnings,
  serializeProvinces,
  threeDayDates,
  toPublicSlot,
  type CalendarJobRecord,
} from "@/lib/calendar/schedule";

const baseJob = (overrides: Partial<CalendarJobRecord> = {}): CalendarJobRecord => ({
  caseId: "case-1",
  caseNumber: "SE-1",
  customerName: "John Smith",
  customerPhone: "+66 81 234 5678",
  customerEmail: "john@example.com",
  serviceId: "svc-license",
  serviceName: "Thai Driver's License",
  staffId: "staff-grace",
  staffName: "Grace",
  closedByName: "Cee",
  start: "2026-10-10T03:00:00.000Z",
  allDay: false,
  province: "Bangkok",
  location: "Bangkok",
  status: "confirmed",
  invoiceId: "inv-1",
  invoiceNumber: "INV-2026-00001",
  totalSatang: 1_500_000,
  depositSatang: 500_000,
  outstandingSatang: 1_000_000,
  documents: ["Passport"],
  description: "License conversion",
  ...overrides,
});

describe("company calendar", () => {
  it("lists every Thai province once and gives Bangkok and Chonburi different colours", () => {
    expect(new Set(THAI_PROVINCE_NAMES).size).toBe(77);
    expect(provinceStyle("Bangkok").color).not.toBe(provinceStyle("Chonburi").color);
    expect(provinceStyle("Bangkok").textColor).not.toBe(provinceStyle("Bangkok").color);
    expect(provinceStyle(null).name).toBe("Province needed");
  });

  it("suggests a province from the location and keeps a staff choice", () => {
    expect(detectProvince("Chonburi Land Transport Office")).toBe("Chonburi");
    expect(detectProvince("Nana Plaza")).toBeNull();
    expect(suggestedProvince("Bangkok", "Chonburi Land Transport Office")).toBe("Bangkok");
    expect(suggestedProvince("", "Chonburi Land Transport Office")).toBe("Chonburi");
    expect(suggestedProvince(null, "a side street")).toBeNull();
  });

  it("matches a province without a new query", () => {
    expect(matchesProvince("Bangkok", [])).toBe(true);
    expect(matchesProvince("Bangkok", ["Bangkok", "Chonburi"])).toBe(true);
    expect(matchesProvince(null, [""])).toBe(true);
    expect(matchesProvince("Phuket", ["Bangkok"])).toBe(false);
    expect(matchesProvince(undefined, ["Bangkok"])).toBe(false);
  });

  it("keeps a missing province in the filter and labels it Province needed", () => {
    expect(parseProvinceParam("Bangkok,__needed")).toEqual(["Bangkok", ""]);
    expect(serializeProvinces(["Bangkok", ""])).toBe("Bangkok,__needed");
    expect(parseProvinceParam(undefined)).toEqual([]);
    const summary = calendarSummary([baseJob({ province: null }), baseJob({ caseId: "case-2", province: "Phuket" })]);
    expect(summary.provinces.map((item) => item.name)).toEqual(["Phuket", "Province needed"]);
  });

  it("loads only the visible Thailand date range", () => {
    const dates = monthGridDates("2026-10-10");
    expect(dates[0]).toBe("2026-09-28");
    expect(dates.at(-1)).toBe("2026-11-01");
    const october = calendarRange("month", "2026-10-10");
    expect(october.start.toISOString()).toBe("2026-09-27T17:00:00.000Z");
    expect(october.end.toISOString()).toBe("2026-11-01T17:00:00.000Z");
    expect(threeDayDates("2026-10-10")).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(parseCalendarView("threeday")).toBe("threeday");
    expect(parseCalendarView(undefined, "week")).toBe("week");
    const day = calendarRange("day", "2026-10-10");
    expect(day.start.toISOString()).toBe("2026-10-09T17:00:00.000Z");
    expect(day.end.toISOString()).toBe("2026-10-10T17:00:00.000Z");
  });

  it("stores a manual event in Thailand time and keeps an all-day event on that date", () => {
    const timed = manualEventWindow({
      date: "2026-10-08",
      time: "10:00",
      endDate: "2026-10-08",
      endTime: "11:30",
      allDay: false,
    });
    expect(timed?.start.toISOString()).toBe("2026-10-08T03:00:00.000Z");
    expect(timed?.end.toISOString()).toBe("2026-10-08T04:30:00.000Z");
    expect(manualEventWindow({ date: "2026-10-08", time: "11:00", endDate: "2026-10-08", endTime: "10:00", allDay: false })).toBeNull();
    const allDay = manualEventWindow({ date: "2026-10-08", time: "00:00", endDate: "2026-10-08", endTime: "00:00", allDay: true });
    expect(allDay?.start.toISOString()).toBe("2026-10-07T17:00:00.000Z");
    expect(allDay?.end.toISOString()).toBe("2026-10-08T17:00:00.000Z");
    expect(eventCoversDate({ start: allDay!.start.toISOString(), end: allDay!.end.toISOString() }, "2026-10-08")).toBe(true);
    expect(eventCoversDate({ start: allDay!.start.toISOString(), end: allDay!.end.toISOString() }, "2026-10-09")).toBe(false);
  });

  it("keeps an event's length when it is dragged to another time", () => {
    const timed = {
      id: "event-1",
      title: "Office block",
      description: null,
      start: "2026-10-08T03:00:00.000Z",
      end: "2026-10-08T04:30:00.000Z",
      allDay: false,
      type: "appointment" as const,
      color: null,
      staffId: null,
      staffName: null,
      location: "DLT Chonburi",
      province: "Chonburi",
    };
    const moved = movedManualEvent(timed, "2026-10-09", "14:00");
    expect(moved?.date).toBe("2026-10-09");
    expect(moved?.time).toBe("14:00");
    expect(moved?.endDate).toBe("2026-10-09");
    expect(moved?.endTime).toBe("15:30");
    expect(moved?.allDay).toBe(false);
    expect(moved?.location).toBe("DLT Chonburi");
    expect(moved?.province).toBe("Chonburi");
    const day = movedManualEvent(
      { ...timed, allDay: true, start: "2026-10-07T17:00:00.000Z", end: "2026-10-09T17:00:00.000Z" },
      "2026-10-12",
      null,
    );
    expect(day?.allDay).toBe(true);
    expect(day?.date).toBe("2026-10-12");
    expect(day?.endDate).toBe("2026-10-13");
    expect(day?.province).toBe("Chonburi");
  });

  it("keeps an appointment location and only accepts a real province", () => {
    expect(normalizeManualPlace({ location: "  DLT Bangkok  ", province: "bangkok" })).toEqual({
      location: "DLT Bangkok",
      province: "Bangkok",
      errors: {},
    });
    expect(normalizeManualPlace({ location: "", province: "" })).toEqual({
      location: null,
      province: null,
      errors: {},
    });
    expect(normalizeManualPlace({ location: "home", province: "Not a province" }).errors.province).toBe(
      "Choose a province from the list.",
    );
  });

  it("keeps 10:00 Thailand as 03:00 UTC and prefers agenda on a phone", () => {
    expect(preferredCalendarView(390)).toBe("agenda");
    expect(preferredCalendarView(900)).toBe("week");
    expect(preferredCalendarView(1200)).toBe("week");
    expect(resolveCalendarView({ context: "wide" })).toBe("week");
    expect(resolveCalendarView({ context: "narrow" })).toBe("agenda");
    expect(resolveCalendarView({ context: "wide", widePreference: "day" })).toBe("day");
    expect(resolveCalendarView({ context: "narrow", widePreference: "day" })).toBe("agenda");
    expect(resolveCalendarView({ context: "narrow", narrowPreference: "week", widePreference: "month" })).toBe("week");
    expect(resolveCalendarView({ context: "wide", requested: "month", widePreference: "day" })).toBe("month");
    const slot = toPublicSlot({
      start: new Date("2026-10-10T03:00:00.000Z"),
      allDay: false,
      province: "Bangkok",
      serviceName: "Thai Driver's License",
      status: "confirmed",
    });
    expect(slot).toEqual({
      date: "2026-10-10",
      time: "10:00 AM",
      province: "Bangkok",
      service: "Thai Driver's License",
      availability: "booked",
    });
    expect(JSON.stringify(slot)).not.toMatch(/john@example.com|234 5678|INV-|15000|Passport/i);
  });

  it("hides private fields and cancelled jobs from the public calendar", () => {
    expect(
      toPublicSlot({
        start: new Date("2026-10-10T03:00:00.000Z"),
        allDay: false,
        province: "Bangkok",
        serviceName: "Visa",
        status: "cancelled",
      })
    ).toBeNull();
  });

  it("filters by province, staff, service, status, and search", () => {
    const jobs = [
      baseJob(),
      baseJob({
        caseId: "case-2",
        customerName: "Sarah Jones",
        staffId: "staff-cee",
        staffName: "Cee",
        province: "Chonburi",
        serviceId: "svc-marriage",
        serviceName: "Marriage Registration",
        status: "completed",
        invoiceNumber: "INV-2026-00002",
      }),
      baseJob({ caseId: "case-3", status: "cancelled", customerName: "Michael Brown", allDay: true }),
      baseJob({ caseId: "case-tbd", allDay: true, status: "confirmed", customerName: "Awaiting time", staffId: "staff-cee" }),
      baseJob({ caseId: "case-refunded", status: "refunded", customerName: "Refunded Client" }),
      baseJob({ caseId: "case-refund-pending", status: "refund_pending", customerName: "Pending Refund" }),
    ];
    const visible = (status: string, q = "") =>
      filterCalendarJobs(jobs, { provinces: [], staffId: "", serviceId: "", status, q }).map((job) => job.caseId);
    expect(filterCalendarJobs(jobs, { provinces: ["Chonburi"], staffId: "", serviceId: "", status: "all", q: "" })).toHaveLength(1);
    expect(filterCalendarJobs(jobs, { provinces: [], staffId: "staff-grace", serviceId: "", status: "all", q: "" }).map((job) => job.caseId)).toEqual(["case-1"]);
    expect(filterCalendarJobs(jobs, { provinces: [], staffId: "", serviceId: "svc-marriage", status: "all", q: "" })).toHaveLength(1);
    expect(visible("completed")).toEqual(["case-2"]);
    expect(visible("cancelled")).toEqual(["case-1", "case-2", "case-tbd"]);
    expect(visible("tbd")).toEqual(["case-tbd"]);
    expect(visible("all")).toEqual(["case-1", "case-2", "case-tbd"]);
    expect(visible("all", "michael")).toEqual([]);
    expect(visible("all", "refund")).toEqual([]);
    expect(filterCalendarJobs(jobs, { provinces: [], staffId: "", serviceId: "", status: "all", q: "INV-2026-00002" })).toHaveLength(1);
    expect(filterCalendarJobs(jobs, { provinces: [], staffId: "", serviceId: "", status: "all", q: "john smith" })).toHaveLength(1);
    expect(filterCalendarJobs(jobs, { provinces: [""], staffId: "", serviceId: "", status: "all", q: "" }).map((job) => job.caseId)).toEqual([]);
    const missing = baseJob({ caseId: "case-4", province: null, customerName: "No Province" });
    expect(filterCalendarJobs([missing, ...jobs], { provinces: [""], staffId: "", serviceId: "", status: "all", q: "" }).map((job) => job.caseId)).toEqual(["case-4"]);
  });

  it("warns on a staff time clash and a short province change", () => {
    const start = new Date("2026-10-10T03:00:00.000Z");
    const warnings = schedulingWarnings(
      {
        caseId: "new",
        staffId: "staff-grace",
        staffName: "Grace",
        start,
        end: new Date(start.getTime() + 60 * 60 * 1000),
        province: "Chonburi",
      },
      [
        {
          caseId: "old",
          staffId: "staff-grace",
          staffName: "Grace",
          customerName: "John Smith",
          province: "Bangkok",
          start,
          end: new Date(start.getTime() + 60 * 60 * 1000),
          status: "confirmed",
        },
      ]
    );
    expect(warnings.map((warning) => warning.kind)).toEqual(["conflict"]);
    const later = schedulingWarnings(
      {
        caseId: "new",
        staffId: "staff-grace",
        staffName: "Grace",
        start: new Date("2026-10-10T04:00:00.000Z"),
        end: new Date("2026-10-10T05:00:00.000Z"),
        province: "Phuket",
      },
      [
        {
          caseId: "old",
          staffId: "staff-grace",
          staffName: "Grace",
          customerName: "John Smith",
          province: "Bangkok",
          start,
          end: new Date(start.getTime() + 60 * 60 * 1000),
          status: "confirmed",
        },
      ]
    );
    expect(later.map((warning) => warning.kind)).toEqual(["travel"]);
  });

  it("backfills each scheduled job once and leaves undated jobs unscheduled", () => {
    const first = planBackfill([
      { caseId: "a", scheduledAt: new Date("2026-10-10T03:00:00.000Z"), primaryEventId: null },
      { caseId: "b", scheduledAt: null, primaryEventId: null },
    ]);
    expect(first).toMatchObject({ scanned: 2, already: 0, added: 1, unscheduled: 1, errors: 0 });
    const second = planBackfill([
      { caseId: "a", scheduledAt: new Date("2026-10-10T03:00:00.000Z"), primaryEventId: "event-a" },
      { caseId: "b", scheduledAt: null, primaryEventId: null },
    ]);
    expect(second.added).toBe(0);
    expect(second.already).toBe(1);
    expect(isUnscheduledJob({ scheduledAt: null, status: "awaiting_payment" })).toBe(true);
    expect(isUnscheduledJob({ scheduledAt: null, status: "confirmed" })).toBe(true);
    expect(isUnscheduledJob({ scheduledAt: new Date(), status: "confirmed" })).toBe(false);
  });

  it("reschedules the same job, invoice, and customer", () => {
    const plan = reschedulePlan({ caseId: "case-1", invoiceId: "inv-1", customerId: "cust-1" }, "2026-10-11", "11:00");
    expect(plan.caseId).toBe("case-1");
    expect(plan.invoiceId).toBe("inv-1");
    expect(plan.customerId).toBe("cust-1");
    expect(plan.scheduledAt?.toISOString()).toBe("2026-10-11T04:00:00.000Z");
  });

  it("refuses the internal calendar to a customer account", () => {
    expect(() => assertJobIntakeAccess("customer")).toThrow(/Unauthorized/);
    expect(() => assertJobIntakeAccess("admin")).not.toThrow();
    expect(() => assertJobIntakeAccess("staff")).not.toThrow();
  });
});
