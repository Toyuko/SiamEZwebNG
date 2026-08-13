const NAME_TO_SLUG: Record<string, string> = {
  "marriage registration": "marriage-registration",
  "driver license service": "driver-license",
  "vehicle registration": "vehicle-registration",
  "translation services": "translation-services",
  "police clearence check full package": "police-clearance",
  "police clearance check full package": "police-clearance",
  "police clearance": "police-clearance",
  visa: "visa-services",
  "visa services": "visa-services",
  "car finding": "car-motorbike-finder-selling-service",
  "car selling": "car-motorbike-finder-selling-service",
  "bike finding": "car-motorbike-finder-selling-service",
  "bike selling": "car-motorbike-finder-selling-service",
  "office services": "office-services",
  "test service": "legacy-test-service",
};

export const SERVICES_TO_ENSURE: Array<{ slug: string; name: string; active: boolean }> = [
  { slug: "office-services", name: "Office Services", active: true },
  { slug: "legacy-test-service", name: "Test Service", active: false },
];

export function normalizeServiceName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapLegacyServiceToSlug(name: string | null | undefined): string | null {
  const key = normalizeServiceName(name);
  if (!key) return null;
  return NAME_TO_SLUG[key] ?? null;
}
