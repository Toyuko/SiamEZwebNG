import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateCondition } from "@/components/wizard/lib/conditionals";
import { buildStepSchema, validateStep } from "@/components/wizard/lib/build-step-schema";
import { resolveVisibleSteps } from "@/components/wizard/lib/resolve-steps";
import {
  autosaveStorageKey,
  clearAutosave,
  loadAutosave,
  saveAutosave,
  type WizardAutosavePayload,
} from "@/components/wizard/lib/autosave";
import { serviceSlugs } from "@/config/services";
import {
  assertAllServicesHaveWizardConfigs,
  getWizardConfig,
  hasWizardEngine,
  marriageRegistrationWizard,
} from "@/config/wizards";
import { buildDriverLicenseFormData } from "@/config/wizards/driver-license";
import { buildVehicleFinderFormData } from "@/config/wizards/car-motorbike-finder-selling-service";
import { buildRealEstateFormData } from "@/config/wizards/real-estate-services";
import type { WizardStepConfig } from "@/config/wizards/types";

describe("wizard conditionals", () => {
  it("evaluates equals / truthy / or", () => {
    expect(
      evaluateCondition({ field: "marriageType", equals: "thai_foreign" }, {
        marriageType: "thai_foreign",
      })
    ).toBe(true);

    expect(
      evaluateCondition({ field: "needsTranslation", truthy: true }, {
        needsTranslation: true,
      })
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          or: [
            { field: "marriageType", equals: "thai_foreign" },
            { field: "marriageType", equals: "foreign_foreign" },
          ],
        },
        { marriageType: "foreign_foreign" }
      )
    ).toBe(true);

    expect(
      evaluateCondition({ field: "needsTranslation", truthy: true }, {
        needsTranslation: false,
      })
    ).toBe(false);
  });

  it("treats empty arrays as falsy", () => {
    expect(
      evaluateCondition({ field: "vehicleTypes", truthy: true }, { vehicleTypes: [] })
    ).toBe(false);
    expect(
      evaluateCondition({ field: "vehicleTypes", truthy: true }, {
        vehicleTypes: ["cars"],
      })
    ).toBe(true);
  });
});

describe("wizard step validation", () => {
  const detailsStep: WizardStepConfig = {
    id: "details",
    type: "fields",
    label: "Details",
    fields: [
      { name: "name", type: "text", label: "Full name", required: true },
      { name: "email", type: "email", label: "Email", required: true },
      { name: "phone", type: "phone", label: "Phone", required: true },
    ],
  };

  const questionsStep: WizardStepConfig = {
    id: "questions",
    type: "fields",
    label: "Questions",
    fields: [
      {
        name: "marriageType",
        type: "select",
        label: "Type",
        required: true,
        options: [{ value: "thai_foreign", label: "Thai + Foreign" }],
      },
      {
        name: "partnerNationality",
        type: "text",
        label: "Partner nationality",
        required: true,
        showWhen: { field: "marriageType", equals: "thai_foreign" },
      },
    ],
  };

  it("requires client details", () => {
    const bad = validateStep(detailsStep, { name: "", email: "x", phone: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.fieldErrors.name).toBeTruthy();
      expect(bad.fieldErrors.email).toBeTruthy();
    }

    const good = validateStep(detailsStep, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+66123456789",
    });
    expect(good.success).toBe(true);
  });

  it("skips validation for hidden conditional fields", () => {
    const withoutPartner = validateStep(questionsStep, {
      marriageType: "thai_thai",
    });
    expect(withoutPartner.success).toBe(true);

    const missingPartner = validateStep(questionsStep, {
      marriageType: "thai_foreign",
    });
    expect(missingPartner.success).toBe(false);

    const withPartner = validateStep(questionsStep, {
      marriageType: "thai_foreign",
      partnerNationality: "British",
    });
    expect(withPartner.success).toBe(true);
  });

  it("buildStepSchema only includes visible fields", () => {
    const schema = buildStepSchema(questionsStep, { marriageType: "thai_thai" });
    expect(Object.keys(schema.shape)).toEqual(["marriageType"]);
  });

  it("requires at least one multiselect value", () => {
    const step: WizardStepConfig = {
      id: "types",
      type: "fields",
      label: "Types",
      fields: [
        {
          name: "vehicleTypes",
          type: "multiselect",
          label: "Vehicle types",
          required: true,
          options: [
            { value: "cars", label: "Cars" },
            { value: "vans", label: "Vans" },
          ],
        },
      ],
    };
    expect(validateStep(step, { vehicleTypes: [] }).success).toBe(false);
    expect(validateStep(step, { vehicleTypes: ["cars"] }).success).toBe(true);
  });
});

describe("resolveVisibleSteps", () => {
  it("filters step-level showWhen", () => {
    const config = {
      ...marriageRegistrationWizard,
      steps: [
        ...marriageRegistrationWizard.steps.slice(0, 2),
        {
          id: "extra",
          type: "fields" as const,
          label: "Extra",
          showWhen: { field: "phone", truthy: true as const },
          fields: [{ name: "extra", type: "text" as const, label: "Extra" }],
        },
        ...marriageRegistrationWizard.steps.slice(2),
      ],
    };

    const hidden = resolveVisibleSteps(config, { phone: "" });
    expect(hidden.some((s) => s.id === "extra")).toBe(false);

    const shown = resolveVisibleSteps(config, { phone: "+66" });
    expect(shown.some((s) => s.id === "extra")).toBe(true);
  });
});

describe("wizard registry", () => {
  it("covers every seeded service slug", () => {
    const coverage = assertAllServicesHaveWizardConfigs();
    expect(coverage.ok).toBe(true);
    expect(coverage.missing).toEqual([]);
    expect(serviceSlugs).toHaveLength(13);

    for (const slug of serviceSlugs) {
      expect(hasWizardEngine(slug)).toBe(true);
      expect(getWizardConfig(slug)?.serviceSlug).toBe(slug);
    }
  });

  it("wires marriage-registration to the engine", () => {
    expect(hasWizardEngine("marriage-registration")).toBe(true);
    expect(getWizardConfig("marriage-registration")?.serviceSlug).toBe(
      "marriage-registration"
    );
  });
});

describe("specialty formData transforms", () => {
  it("builds nested driverLicense payload with prices", () => {
    const payload = buildDriverLicenseFormData({
      name: "Ada",
      email: "ada@example.com",
      phone: "+66",
      notes: "  hello  ",
      category: "conversion",
      vehicleType: "bike",
      addonFastTrack: true,
      addonTranslationLetter: false,
      addonAddressCertificate: false,
      appointmentDate: "2026-08-10",
    });

    expect(payload.name).toBe("Ada");
    expect(payload.notes).toBe("hello");
    const dl = payload.driverLicense as {
      category: string;
      vehicleType: string;
      basePriceThb: number;
      addonsTotalThb: number;
      totalThb: number;
      currency: string;
      addons: { fastTrack: boolean };
    };
    expect(dl.category).toBe("conversion");
    expect(dl.vehicleType).toBe("bike");
    expect(dl.basePriceThb).toBe(4500);
    expect(dl.addonsTotalThb).toBe(1500);
    expect(dl.totalThb).toBe(6000);
    expect(dl.currency).toBe("THB");
    expect(dl.addons.fastTrack).toBe(true);
  });

  it("nulls vehicleType for IDP", () => {
    const payload = buildDriverLicenseFormData({
      name: "Ada",
      email: "ada@example.com",
      phone: "+66",
      category: "idp",
      vehicleType: "car",
      appointmentDate: "2026-08-10",
    });
    const dl = payload.driverLicense as { vehicleType: null; basePriceThb: number };
    expect(dl.vehicleType).toBeNull();
    expect(dl.basePriceThb).toBe(3500);
  });

  it("builds nested vehicleFinder payload", () => {
    const payload = buildVehicleFinderFormData({
      name: "Ada",
      email: "ada@example.com",
      phone: "+66",
      requestType: "both",
      vehicleTypes: ["cars", "vans"],
      preferredModels: "Toyota",
      sellVehicleDetails: "Honda 2019",
      interestedInSalesListing: true,
      timeline: "soon",
    });
    const vf = payload.vehicleFinder as {
      requestType: string;
      vehicleTypes: string[];
      buy?: { preferredModels: string };
      sell?: { vehicleDetails: string };
      interestedInSalesListing: boolean;
    };
    expect(vf.requestType).toBe("both");
    expect(vf.vehicleTypes).toEqual(["cars", "vans"]);
    expect(vf.buy?.preferredModels).toBe("Toyota");
    expect(vf.sell?.vehicleDetails).toBe("Honda 2019");
    expect(vf.interestedInSalesListing).toBe(true);
  });

  it("builds nested realEstate payload", () => {
    const payload = buildRealEstateFormData({
      name: "Ada",
      email: "ada@example.com",
      phone: "+66",
      requestType: "buy",
      propertyTypes: ["condo"],
      preferredAreas: "Sukhumvit",
      interestedInListing: false,
    });
    const re = payload.realEstate as {
      requestType: string;
      seeker?: { preferredAreas: string };
      sell?: unknown;
    };
    expect(re.requestType).toBe("buy");
    expect(re.seeker?.preferredAreas).toBe("Sukhumvit");
    expect(re.sell).toBeUndefined();
  });
});

describe("wizard autosave (localStorage)", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  it("saves, loads, and clears draft", () => {
    const key = autosaveStorageKey("marriage-registration");
    const payload: WizardAutosavePayload = {
      version: 1,
      serviceSlug: "marriage-registration",
      stepIndex: 2,
      values: { name: "Ada", email: "ada@example.com", phone: "+66" },
      documents: [{ name: "passport.pdf", size: 1200 }],
      postToMarketplace: false,
      savedAt: new Date().toISOString(),
    };

    saveAutosave(key, payload);
    const loaded = loadAutosave(key);
    expect(loaded?.stepIndex).toBe(2);
    expect(loaded?.values.name).toBe("Ada");
    expect(loaded?.documents[0]?.name).toBe("passport.pdf");

    clearAutosave(key);
    expect(loadAutosave(key)).toBeNull();
  });
});
