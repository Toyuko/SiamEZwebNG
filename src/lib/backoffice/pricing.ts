export type PriceCatalogueItem = {
  code: string;
  name: string;
  amountSatang: number;
  active: boolean;
};

export const DEFAULT_PRICE_CATALOGUE: { code: string; name: string; amountSatang: number; sortOrder: number }[] = [
  { code: "car_driving_licence", name: "Car driving licence", amountSatang: 1_500_000, sortOrder: 10 },
  { code: "motorcycle_driving_licence", name: "Motorcycle driving licence", amountSatang: 1_000_000, sortOrder: 20 },
  { code: "both_licences", name: "Car and motorcycle licences", amountSatang: 2_000_000, sortOrder: 30 },
  { code: "licence_conversion", name: "Licence conversion", amountSatang: 450_000, sortOrder: 40 },
  { code: "international_licence", name: "International driving permit", amountSatang: 450_000, sortOrder: 50 },
  { code: "licence_renewal", name: "Licence renewal", amountSatang: 450_000, sortOrder: 60 },
  { code: "residential_certificate", name: "Residential certificate", amountSatang: 250_000, sortOrder: 70 },
  { code: "translation_letter", name: "Translation letter", amountSatang: 150_000, sortOrder: 80 },
  { code: "booking_only", name: "Booking only", amountSatang: 150_000, sortOrder: 90 },
  { code: "lost_licence_address_update", name: "Lost licence or address update", amountSatang: 150_000, sortOrder: 100 },
];

const PACKAGE_REPLACEMENTS: { requires: string[]; replaceWith: string }[] = [
  {
    requires: ["car_driving_licence", "motorcycle_driving_licence"],
    replaceWith: "both_licences",
  },
];

export function selectPriceCodes(text: string): string[] {
  const t = text.toLowerCase();
  const codes: string[] = [];
  const both =
    /both/.test(t) && /licen[cs]e/.test(t) ||
    /car and motorcycle/.test(t) ||
    /motorcycle and car/.test(t);
  if (both) codes.push("both_licences");
  else {
    if (/\bcar\b/.test(t) && /licen[cs]e/.test(t)) codes.push("car_driving_licence");
    if (/motorcycle|motorbike/.test(t) && /licen[cs]e/.test(t)) codes.push("motorcycle_driving_licence");
  }
  if (/conversion|convert/.test(t)) codes.push("licence_conversion");
  if (/international/.test(t)) codes.push("international_licence");
  if (/renew/.test(t)) codes.push("licence_renewal");
  if (/residential/.test(t)) codes.push("residential_certificate");
  if (/translation/.test(t)) codes.push("translation_letter");
  if (/booking only/.test(t)) codes.push("booking_only");
  if (/lost licen[cs]e|address update/.test(t)) codes.push("lost_licence_address_update");
  return [...new Set(codes)];
}

export type PricedLine = { code: string; name: string; amountSatang: number };

export type PriceSelection = {
  lines: PricedLine[];
  totalSatang: number;
  missing: string[];
  usedPackage: boolean;
};

export function priceSelection(codes: string[], catalogue: PriceCatalogueItem[]): PriceSelection {
  const active = new Map(catalogue.filter((item) => item.active).map((item) => [item.code, item]));
  let next = [...codes];
  let usedPackage = false;
  for (const rule of PACKAGE_REPLACEMENTS) {
    if (rule.requires.every((code) => next.includes(code)) && active.has(rule.replaceWith)) {
      next = next.filter((code) => !rule.requires.includes(code));
      next.push(rule.replaceWith);
      usedPackage = true;
    }
  }
  const lines: PricedLine[] = [];
  const missing: string[] = [];
  for (const code of next) {
    const item = active.get(code);
    if (!item) {
      missing.push(code);
      continue;
    }
    lines.push({ code, name: item.name, amountSatang: item.amountSatang });
  }
  return {
    lines,
    totalSatang: lines.reduce((sum, line) => sum + line.amountSatang, 0),
    missing,
    usedPackage,
  };
}
