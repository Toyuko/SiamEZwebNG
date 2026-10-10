import { describe, expect, it } from "vitest";
import { canManageDirectory, canReadDirectory } from "@/lib/directory/access";
import {
  DIRECTORY_CSV_COLUMNS,
  csvTemplate,
  parseCsv,
  previewDirectoryCsv,
  toCsv,
} from "@/lib/directory/csv";
import { isVerificationStale } from "@/lib/directory/constants";
import { officeMapsHref } from "@/lib/directory/maps";
import { officeInputSchema } from "@/lib/directory/office-input";
import { addressCopyText, officeActions, phoneToTel } from "@/lib/directory/phone";
import { THAI_PROVINCES, resolveProvinceCode } from "@/lib/directory/provinces";
import {
  buildDirectoryWhere,
  recordMatchesQuery,
  searchTokens,
} from "@/lib/directory/search";
import { STARTER_OFFICES, STARTER_SERVICES } from "@/lib/directory/starter-data";

const reader = {
  role: "freelancer" as const,
  active: true,
  directoryAccess: true,
  freelancerVerified: true,
};

describe("directory access", () => {
  it("lets active staff and admins read, and only admins manage", () => {
    expect(canReadDirectory({ role: "staff", active: true, directoryAccess: false, freelancerVerified: false })).toBe(true);
    expect(canManageDirectory({ role: "staff", active: true, directoryAccess: false, freelancerVerified: false })).toBe(false);
    expect(canManageDirectory({ role: "admin", active: true, directoryAccess: false, freelancerVerified: false })).toBe(true);
  });

  it("requires a verified freelancer and an explicit grant", () => {
    expect(canReadDirectory(reader)).toBe(true);
    expect(canReadDirectory({ ...reader, directoryAccess: false })).toBe(false);
    expect(canReadDirectory({ ...reader, freelancerVerified: false })).toBe(false);
    expect(canReadDirectory({ ...reader, active: false })).toBe(false);
    expect(canReadDirectory({ ...reader, role: "customer" })).toBe(false);
  });
});

describe("directory search", () => {
  it("matches every token across Thai and English text", () => {
    const text = "chiang mai provincial land transport สำนักงานขนส่งจังหวัดเชียงใหม่ dlt";
    expect(recordMatchesQuery(text, "DLT Chiang Mai")).toBe(true);
    expect(recordMatchesQuery(text, "ขนส่ง เชียงใหม่")).toBe(true);
    expect(recordMatchesQuery(text, "Phuket immigration")).toBe(false);
    expect(searchTokens("  ใบขับขี่   เชียงใหม่ ")).toEqual(["ใบขับขี่", "เชียงใหม่"]);
  });

  it("filters by province, category, service, and Bangkok", () => {
    const where = buildDirectoryWhere({
      province: "50",
      category: "dlt",
      service: "thai-driving-licence",
      area: "other",
      status: "unverified",
    });
    expect(JSON.stringify(where)).toContain("50");
    expect(JSON.stringify(where)).toContain("dlt");
    expect(JSON.stringify(where)).toContain("thai-driving-licence");
    expect(JSON.stringify(where)).toContain("unverified");
    expect(buildDirectoryWhere({ area: "bangkok" })).toMatchObject({
      AND: [{ archivedAt: null }, { provinceCode: "10" }],
    });
  });

  it("returns an empty-match shape when the query has no tokens", () => {
    expect(searchTokens("   ")).toEqual([]);
    expect(recordMatchesQuery("anything", "")).toBe(true);
    expect(buildDirectoryWhere({})).toEqual({ archivedAt: null });
  });
});

describe("office actions", () => {
  it("builds a tel link and refuses a blank number", () => {
    expect(phoneToTel("053 123 456")).toBe("tel:053123456");
    expect(phoneToTel("")).toBeNull();
    expect(phoneToTel("ab")).toBeNull();
  });

  it("uses coordinates when they exist and never invents them", () => {
    expect(officeMapsHref({ latitude: 18.7883, longitude: 98.9853 })).toContain("18.7883,98.9853");
    expect(officeMapsHref({ latitude: 18.7883, longitude: null, addressEn: "Chiang Mai" })).toContain(
      encodeURIComponent("Chiang Mai")
    );
    expect(officeMapsHref({ latitude: null, longitude: null, addressEn: null, nameEn: null })).toBeNull();
  });

  it("copies the saved address and hides actions when details are missing", () => {
    const incomplete = officeActions({});
    expect(incomplete.callHref).toBeNull();
    expect(incomplete.addressCopy).toBeNull();
    expect(incomplete.websiteHref).toBeNull();
    expect(addressCopyText({ addressTh: "เชียงใหม่", provinceName: "Chiang Mai" })).toContain("เชียงใหม่");
  });
});

describe("directory csv", () => {
  const known = {
    knownCategorySlugs: ["dlt"],
    knownServiceSlugs: ["thai-driving-licence"],
    existing: [
      { id: "1", slug: "dlt-chiang-mai", nameEn: "Chiang Mai Provincial Land Transport Office", provinceCode: "50", phonePrimary: null },
    ],
  };

  it("keeps Thai text and a spreadsheet BOM", () => {
    const csv = toCsv([{ name_th: "สำนักงานขนส่งจังหวัดเชียงใหม่", name_en: "Chiang Mai", category_slug: "dlt", province_code: "50" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(parseCsv(csv)[1]?.join(",")).toContain("สำนักงานขนส่งจังหวัดเชียงใหม่");
    expect(csvTemplate()).toContain("EXAMPLE-DELETE-THIS-ROW");
    expect(DIRECTORY_CSV_COLUMNS).toContain("phone_primary");
  });

  it("rejects unknown provinces and does not mark imports verified", () => {
    const csv = toCsv([
      {
        name_en: "New office",
        name_th: "หน่วยงานใหม่",
        category_slug: "dlt",
        province_code: "Not A Province",
        verification_status: "verified",
        phone_primary: "021234567",
      },
      {
        slug: "dlt-chiang-mai",
        name_en: "Chiang Mai Provincial Land Transport Office",
        name_th: "สำนักงานขนส่งจังหวัดเชียงใหม่",
        category_slug: "dlt",
        province_code: "Chiang Mai",
        service_slugs: "missing-service",
      },
    ]);
    const preview = previewDirectoryCsv({ csv, ...known });
    expect(preview.rows[0]?.action).toBe("reject");
    expect(preview.rows[0]?.errors.some((error) => error.column === "province_code")).toBe(true);
    expect(preview.rows[0]?.values.verification_status).toBe("needs_verification");
    expect(preview.rows[1]?.errors.some((error) => error.column === "service_slugs")).toBe(true);
    expect(preview.rows[1]?.action).toBe("reject");
  });

  it("skips an existing office unless update is requested", () => {
    const csv = toCsv([
      {
        slug: "dlt-chiang-mai",
        name_en: "Chiang Mai Provincial Land Transport Office",
        name_th: "สำนักงานขนส่งจังหวัดเชียงใหม่",
        category_slug: "dlt",
        province_code: "Chiang Mai",
      },
    ]);
    expect(previewDirectoryCsv({ csv, ...known }).rows[0]?.action).toBe("skip");
    expect(previewDirectoryCsv({ csv, ...known, updateExisting: true }).rows[0]?.action).toBe("update");
  });

  it("skips the example row and reports duplicates inside the file", () => {
    const preview = previewDirectoryCsv({
      csv: csvTemplate(),
      ...known,
      existing: [],
    });
    expect(preview.rows[0]?.action).toBe("skip");
  });

  it("prefixes spreadsheet formulas", () => {
    const csv = toCsv([{ name_en: "=HYPERLINK(\"http://evil\")", name_th: "ทดสอบ", category_slug: "dlt", province_code: "10" }]);
    expect(csv).toContain("'=HYPERLINK");
  });
});

describe("office validation", () => {
  it("accepts a partial office and rejects coordinates outside Thailand", () => {
    const parsed = officeInputSchema.safeParse({
      nameEn: "Phuket Immigration Office",
      nameTh: null,
      categorySlug: "immigration",
      provinceCode: "Phuket",
      verificationStatus: "unverified",
    });
    expect(parsed.success).toBe(true);
    const bad = officeInputSchema.safeParse({
      nameEn: "Somewhere",
      categorySlug: "dlt",
      provinceCode: "10",
      latitude: 51.5,
      longitude: -0.1,
      verificationStatus: "unverified",
    });
    expect(bad.success).toBe(false);
  });
});

describe("verification age", () => {
  const now = new Date("2026-10-10T00:00:00.000Z");

  it("flags unverified and stale records without treating imports as verified", () => {
    expect(
      isVerificationStale({
        verificationStatus: "unverified",
        lastVerifiedAt: now,
        reminderDays: 90,
        now,
      })
    ).toBe(true);
    expect(
      isVerificationStale({
        verificationStatus: "verified",
        lastVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        reminderDays: 90,
        now,
      })
    ).toBe(true);
    expect(
      isVerificationStale({
        verificationStatus: "verified",
        lastVerifiedAt: new Date("2026-09-01T00:00:00.000Z"),
        reminderDays: 90,
        now,
      })
    ).toBe(false);
  });
});

describe("starter data", () => {
  it("covers all 77 provinces and does not invent contact details", () => {
    expect(new Set(THAI_PROVINCES.map((province) => province.code)).size).toBe(77);
    expect(resolveProvinceCode("เชียงใหม่")).toBe("50");
    expect(resolveProvinceCode("Bangkok")).toBe("10");
    for (const office of STARTER_OFFICES) {
      expect(office.verificationStatus).not.toBe("verified");
      expect(office).not.toHaveProperty("phonePrimary");
      expect(office).not.toHaveProperty("addressEn");
      expect(office).not.toHaveProperty("addressTh");
      expect(office).not.toHaveProperty("latitude");
      expect(office).not.toHaveProperty("openingHoursText");
    }
    expect(STARTER_SERVICES.length).toBeGreaterThan(0);
    expect(STARTER_OFFICES.every((office) => office.sourceNotes.length > 20)).toBe(true);
  });
});
