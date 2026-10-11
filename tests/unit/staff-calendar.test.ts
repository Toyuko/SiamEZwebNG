import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRIVATE_PATHS } from "@/app/robots";
import { staffCaseSelect, staffManualSelect } from "@/data-access/staff-calendar";
import * as publicCalendarRoute from "@/app/api/public-calendar/route";
import { bangkokTimeInputValue } from "@/lib/jobs/intake";
import { calendarRange, preferredCalendarView } from "@/lib/calendar/schedule";
import {
  assertStaffRange,
  buildStaffEvent,
  jobStaffEvent,
  normalizeStaffView,
  staffCaseWhere,
  staffEventKey,
  staffManualWhere,
} from "@/lib/calendar/staff-calendar";
import {
  assertStaffPayload,
  publicJobStatus,
  publicStaffLabel,
  publicStaffNames,
  safePlace,
  staffCalendarHref,
  staffEventMatches,
  type StaffCalendarEvent,
} from "@/lib/calendar/staff-calendar-shared";

const openFilters = { provinces: [], staffId: "", serviceId: "", status: "all", q: "" };

function keysOf(value: unknown, found: string[] = []): string[] {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value) keysOf(item, found);
    return found;
  }
  for (const [key, nested] of Object.entries(value)) {
    found.push(key);
    keysOf(nested, found);
  }
  return found;
}

describe("staff calendar", () => {
  it("keeps phone agenda and desktop week as the defaults", () => {
    expect(preferredCalendarView(320)).toBe("agenda");
    expect(preferredCalendarView(390)).toBe("agenda");
    expect(preferredCalendarView(768)).toBe("week");
    expect(preferredCalendarView(1440)).toBe("week");
    expect(normalizeStaffView("threeday")).toBe("week");
    expect(normalizeStaffView("agenda")).toBe("agenda");
  });

  it("loads only the visible Thailand range", () => {
    const day = calendarRange("day", "2026-10-12");
    expect(day.end.getTime() - day.start.getTime()).toBe(24 * 60 * 60 * 1000);
    assertStaffRange(day.start, day.end);
    const month = calendarRange("month", "2026-10-12");
    assertStaffRange(month.start, month.end);
    expect(() => assertStaffRange(new Date("2026-01-01T00:00:00.000Z"), new Date("2026-06-01T00:00:00.000Z"))).toThrow(
      "Invalid calendar range"
    );
  });

  it("shows 10:00 Thailand time from any clock", () => {
    const event = jobStaffEvent({
      sourceId: "cm123caseidnotpublic",
      caseNumber: "SE-2026-00012",
      start: new Date("2026-10-12T03:00:00.000Z"),
      allDay: false,
      serviceName: "Driver's License",
      province: "Bangkok",
      location: "Chatuchak",
      staffName: "Grace",
      status: "confirmed",
    });
    expect(bangkokTimeInputValue(new Date(event.start))).toBe("10:00");
    expect(event.service).toBe("Driver's License");
    expect(event.province).toBe("Bangkok");
    expect(event.staff).toBe("Grace");
    expect(event.status).toBe("confirmed");
    expect(event.ref).toBe("SE-2026-00012");
    expect(event.id).toBe(staffEventKey("cm123caseidnotpublic"));
    expect(event.id).not.toContain("cm123");
    expect(event.location).toBe("Chatuchak");
  });

  it("withholds contact details, money, and documents", () => {
    const event = buildStaffEvent({
      sourceId: "case-private",
      caseNumber: "SE-1",
      start: new Date("2026-10-12T03:00:00.000Z"),
      end: new Date("2026-10-12T04:00:00.000Z"),
      allDay: false,
      serviceName: "Marriage Registration",
      province: null,
      location: "Home +66 81 234 5678",
      staffName: "cee@siamez.com",
      status: "confirmed",
    });
    expect(event.location).toBeNull();
    expect(event.staff).toBe("TBD");
    expect(event.province).toBeNull();
    expect(safePlace("john@example.com")).toBeNull();
    expect(publicStaffLabel("Grace")).toBe("Grace");
    expect(publicStaffNames([{ name: "Grace" }, { name: "ops@siamez.com" }, { name: null }])).toEqual(["Grace"]);
    expect(publicJobStatus("awaiting_payment")).toBe("scheduled");
    expect(publicJobStatus("paid")).toBe("scheduled");
    expect(publicJobStatus("confirmed")).toBe("confirmed");
    expect(JSON.stringify(event)).not.toMatch(/payment|invoice|deposit|email|phone/i);
    const payload = {
      events: [event],
      services: [{ id: "svc-1", name: "Marriage Registration" }],
      staff: ["Grace"],
      fetchedAt: "2026-10-11T15:32:00.000Z",
      truncated: false,
    };
    expect(() => assertStaffPayload(payload)).not.toThrow();
    const leaked = {
      ...payload,
      events: [{ ...event, customerEmail: "john@example.com", invoiceNumber: "INV-1" } as StaffCalendarEvent],
    };
    expect(() => assertStaffPayload(leaked)).toThrow(/private data/);
    expect(JSON.stringify(payload)).not.toMatch(/john@example.com|81 234|INV-|customerEmail|invoice/);
  });

  it("searches service, province, staff, and reference only", () => {
    const event: StaffCalendarEvent = {
      id: "opaque",
      start: "2026-10-12T03:00:00.000Z",
      end: "2026-10-12T04:00:00.000Z",
      allDay: false,
      service: "Driver's License",
      province: "Bangkok",
      location: "Secret home",
      staff: "Grace",
      status: "confirmed",
      ref: "SE-2026-00012",
    };
    expect(staffEventMatches(event, { ...openFilters, q: "grace" }, "svc-1")).toBe(true);
    expect(staffEventMatches(event, { ...openFilters, q: "bangkok" }, "svc-1")).toBe(true);
    expect(staffEventMatches(event, { ...openFilters, q: "SE-2026" }, "svc-1")).toBe(true);
    expect(staffEventMatches(event, { ...openFilters, q: "secret home" }, "svc-1")).toBe(false);
    expect(staffEventMatches(event, { ...openFilters, q: "john smith" }, "svc-1")).toBe(false);
    expect(staffEventMatches(event, { ...openFilters, status: "cancelled" }, null)).toBe(false);
    expect(staffEventMatches({ ...event, status: "cancelled" }, { ...openFilters, status: "cancelled" }, null)).toBe(true);
    expect(staffEventMatches({ ...event, status: "refunded" }, openFilters, null)).toBe(false);
    const where = staffCaseWhere(new Date("2026-10-01T00:00:00.000Z"), new Date("2026-10-20T00:00:00.000Z"), {
      ...openFilters,
      q: "john@example.com",
    });
    const names = keysOf(where);
    for (const forbidden of ["guestEmail", "guestPhone", "guestName", "jobDescription", "documentsRequired", "dealValue", "invoices", "payments"]) {
      expect(names).not.toContain(forbidden);
    }
    expect(keysOf(staffManualWhere(new Date("2026-10-01T00:00:00.000Z"), new Date("2026-10-08T00:00:00.000Z"), openFilters))).not.toContain(
      "description"
    );
  });

  it("reads only safe columns from jobs and appointments", () => {
    expect(staffCaseSelect).not.toHaveProperty("guestEmail");
    expect(staffCaseSelect).not.toHaveProperty("guestPhone");
    expect(staffCaseSelect).not.toHaveProperty("guestName");
    expect(staffCaseSelect).not.toHaveProperty("jobDescription");
    expect(staffCaseSelect).not.toHaveProperty("documentsRequired");
    expect(staffCaseSelect).not.toHaveProperty("dealValue");
    expect(staffCaseSelect).not.toHaveProperty("invoices");
    expect(staffCaseSelect).not.toHaveProperty("user");
    expect(staffCaseSelect.staffAssignments.select.user.select).toEqual({ name: true });
    expect(staffManualSelect).not.toHaveProperty("description");
    expect(staffManualSelect.staff.select).toEqual({ name: true });
  });

  it("does not publish the staff calendar or accept changes", () => {
    expect(PRIVATE_PATHS).toEqual(expect.arrayContaining(["/staff-calendar", "/en/staff-calendar", "/th/staff-calendar", "/api/public-calendar"]));
    expect(readFileSync("src/app/sitemap.ts", "utf8")).not.toContain("staff-calendar");
    expect(publicCalendarRoute.GET).toEqual(expect.any(Function));
    expect(publicCalendarRoute).not.toHaveProperty("POST");
    expect(publicCalendarRoute).not.toHaveProperty("PUT");
    expect(publicCalendarRoute).not.toHaveProperty("PATCH");
    expect(publicCalendarRoute).not.toHaveProperty("DELETE");
    const href = staffCalendarHref({ date: "2026-10-12", view: "agenda", provinces: ["Bangkok"], staffId: "Grace", serviceId: "", status: "all", q: "" });
    expect(href.startsWith("/staff-calendar?")).toBe(true);
    expect(href).not.toMatch(/email|phone|invoice|customer/i);
  });
});
