import { describe, expect, it } from "vitest";
import { detectDuplicates } from "@/lib/legacy-migration/duplicates";
import { thbToSatang, satangToThb } from "@/lib/legacy-migration/money";
import { normalizeEmail, normalizePhone, splitName, syntheticCustomerEmail } from "@/lib/legacy-migration/normalize";
import { mapLegacyServiceToSlug } from "@/lib/legacy-migration/service-map";
import { mapJobStatusToCaseStatus, mapPaymentMethod, stableCaseNumber } from "@/lib/legacy-migration/status-map";
import { transformLegacyExtract } from "@/lib/legacy-migration/transform";
import { validateTransformedBundle } from "@/lib/legacy-migration/validate";
import { buildReportCounts, formatMigrationReportText } from "@/lib/legacy-migration/report";
import type { LegacyExtract } from "@/lib/legacy-migration/types";

function sampleExtract(): LegacyExtract {
  return {
    extractedAt: "2026-08-12T00:00:00.000Z",
    sourceBaseUrl: "https://siam-ez.com/admin/",
    dashboard: { revenue: 5000 },
    clients: [
      {
        id: 10,
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+66 81 111 1111",
        address: "Bangkok",
        notes: "LINE: @ada",
        created_at: "2026-01-20 12:00:00",
        updated_at: "2026-01-21 12:00:00",
        total_bookings: 1,
      },
      {
        id: 11,
        name: "No Email Client",
        email: "",
        phone: "0822222222",
        address: null,
        notes: null,
        created_at: "2026-02-01 12:00:00",
        updated_at: "2026-02-01 12:00:00",
      },
      {
        id: 12,
        name: "Ada Clone",
        email: null,
        phone: "0811111111",
        address: null,
        notes: null,
        created_at: "2026-03-01 12:00:00",
        updated_at: "2026-03-01 12:00:00",
      },
    ],
    jobs: [
      {
        id: 1,
        client_id: 10,
        service_id: 38,
        booking_date: "2026-04-01 10:00:00",
        status: "completed",
        total_amount: "5000.00",
        cost: "500.00",
        notes: "Bring passport",
        created_at: "2026-03-01 12:00:00",
        updated_at: "2026-04-02 12:00:00",
        service_name: "Driver License Service",
        service_category: "legal",
      },
      {
        id: 2,
        client_id: 11,
        service_id: 1,
        booking_date: "2026-05-01 10:00:00",
        status: "cancelled",
        total_amount: "3000.00",
        cost: "0",
        notes: null,
        created_at: "2026-04-01 12:00:00",
        updated_at: "2026-04-02 12:00:00",
        service_name: "Marriage Registration",
        service_category: "legal",
      },
      {
        id: 3,
        client_id: 10,
        service_id: 40,
        booking_date: "2026-06-01 10:00:00",
        status: "in_progress",
        total_amount: "2000.00",
        cost: "0",
        notes: null,
        created_at: "2026-05-01 12:00:00",
        updated_at: "2026-05-02 12:00:00",
        service_name: "Translation Services",
        service_category: "business",
      },
    ],
    orders: [
      {
        id: 1,
        order_number: "BOOK-1",
        client_id: 10,
        service_id: 38,
        customer_name: "Ada Lovelace",
        customer_email: "ada@example.com",
        customer_phone: null,
        customer_address: null,
        service_name: "Driver License Service",
        payment_method: "manual",
        payment_status: "paid",
        subtotal: "5000.00",
        tax: "0.00",
        total_amount: "5000.00",
        notes: null,
        created_at: "2026-03-01 12:00:00",
        updated_at: "2026-04-02 12:00:00",
        source_type: "booking",
      },
      {
        id: 2,
        order_number: "BOOK-2",
        client_id: 11,
        service_id: 1,
        customer_name: "No Email Client",
        customer_email: null,
        customer_phone: null,
        customer_address: null,
        service_name: "Marriage Registration",
        payment_method: "manual",
        payment_status: "cancelled",
        subtotal: "3000.00",
        tax: "0.00",
        total_amount: "3000.00",
        notes: null,
        created_at: "2026-04-01 12:00:00",
        updated_at: "2026-04-02 12:00:00",
        source_type: "booking",
      },
      {
        id: 3,
        order_number: "BOOK-3",
        client_id: 10,
        service_id: 40,
        customer_name: "Ada Lovelace",
        customer_email: "ada@example.com",
        customer_phone: null,
        customer_address: null,
        service_name: "Translation Services",
        payment_method: "manual",
        payment_status: "paid",
        subtotal: "2000.00",
        tax: "0.00",
        total_amount: "2000.00",
        notes: null,
        created_at: "2026-05-01 12:00:00",
        updated_at: "2026-05-02 12:00:00",
        source_type: "booking",
      },
    ],
    services: [],
    staff: [{ id: 3, name: "Pat", email: "pat@siamez.com", phone: null, role: "staff" }],
    calendarEvents: [],
    assetsCount: 0,
    legalDocumentsCount: 0,
  };
}

describe("legacy money", () => {
  it("converts THB strings to satang without rounding drift", () => {
    expect(thbToSatang("5000.00")).toBe(500000);
    expect(thbToSatang(1698850)).toBe(169885000);
    expect(satangToThb(500000)).toBe(5000);
  });
});

describe("legacy mapping", () => {
  it("maps service names including the police clearance typo", () => {
    expect(mapLegacyServiceToSlug("Driver License Service")).toBe("driver-license");
    expect(mapLegacyServiceToSlug("Police Clearence Check Full Package")).toBe("police-clearance");
    expect(mapLegacyServiceToSlug("Office Services")).toBe("office-services");
  });

  it("maps statuses and payment methods", () => {
    expect(mapJobStatusToCaseStatus("completed", "paid")).toBe("completed");
    expect(mapJobStatusToCaseStatus("confirmed", "paid")).toBe("paid");
    expect(mapJobStatusToCaseStatus("confirmed", "pending")).toBe("awaiting_payment");
    expect(mapJobStatusToCaseStatus("cancelled")).toBe("cancelled");
    expect(mapPaymentMethod("manual")).toBe("bank");
    expect(stableCaseNumber(67, "BOOK-67")).toBe("LEGACY-BOOK-67");
  });

  it("splits names and synthesizes emails", () => {
    expect(splitName("Ada Lovelace")).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(syntheticCustomerEmail(12)).toBe("legacy-customer-12@imported.invalid");
    expect(normalizeEmail(" Ada@Example.com ")).toBe("ada@example.com");
    expect(normalizePhone("+66 81 111 1111")).toBe("66811111111");
  });
});

describe("legacy transform + validate", () => {
  it("preserves job/order amounts and skips invoices for cancelled jobs", () => {
    const { bundle, money } = transformLegacyExtract(sampleExtract());
    expect(bundle.customers).toHaveLength(3);
    expect(bundle.customers.find((c) => c.legacyCustomerId === 11)?.emailIsSynthetic).toBe(true);
    expect(bundle.cases).toHaveLength(3);
    expect(bundle.invoices).toHaveLength(2);
    expect(bundle.payments).toHaveLength(2);
    expect(bundle.payments.reduce((s, p) => s + p.amountSatang, 0)).toBe(700000);
    expect(money.paidThb).toBe(7000);
    expect(money.cancelledThb).toBe(3000);
    expect(money.jobCostThb).toBe(500);
    expect(bundle.cases.find((c) => c.legacyJobId === 1)?.caseNumber).toBe("LEGACY-BOOK-1");
    const issues = validateTransformedBundle(bundle);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("is stable when run twice on the same extract", () => {
    const a = transformLegacyExtract(sampleExtract()).bundle;
    const b = transformLegacyExtract(sampleExtract()).bundle;
    expect(a.cases.map((c) => c.caseNumber)).toEqual(b.cases.map((c) => c.caseNumber));
    expect(a.payments.map((p) => p.idempotencyKey)).toEqual(b.payments.map((p) => p.idempotencyKey));
    expect(a.customers.map((c) => c.email)).toEqual(b.customers.map((c) => c.email));
  });

  it("does not auto-merge likely phone duplicates", () => {
    const report = detectDuplicates({ clients: sampleExtract().clients });
    expect(report.likelyDuplicates.some((d) => d.kind === "exact_phone")).toBe(true);
    expect(report.likelyDuplicates.every((d) => d.needsManualReview)).toBe(true);
    expect(report.newCustomers).toContain(10);
  });
});

describe("legacy report", () => {
  it("prints the required reconciliation block", () => {
    const extract = sampleExtract();
    const { bundle, duplicates, money } = transformLegacyExtract(extract);
    const issues = validateTransformedBundle(bundle);
    const counts = buildReportCounts({ extract, bundle, money, duplicates, issues });
    const text = formatMigrationReportText({
      counts,
      money,
      duplicates,
      issues,
      dryRun: true,
      notes: [],
    });
    expect(text).toContain("SIAMEZ DATA MIGRATION REPORT");
    expect(text).toContain("Customers");
    expect(text).toContain("Revenue");
    expect(text).toContain("Outstanding Balance");
    expect(text).toMatch(/Legacy: 7,000 THB/);
  });
});
