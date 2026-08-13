export type VehicleLeadScore = "high" | "medium" | "low";

export type VehicleAiAnalysis = {
  vehicleSummary: string;
  estimatedMarketMin: number | null;
  estimatedMarketMax: number | null;
  suggestedListingPrice: number | null;
  suggestedMinAcceptable: number | null;
  conditionAssessment: string;
  missingInformation: string[];
  potentialConcerns: string[];
  recommendedService: string;
  recommendedNextAction: string;
  leadQualityScore: VehicleLeadScore;
  leadQualityReason: string;
  estimatesDisclaimer: string;
  isEstimate: true;
  source: "llm" | "rules";
};

export const PRICE_ESTIMATE_DISCLAIMER =
  "Price figures are internal estimates only, not guaranteed market values, and must not be presented to the customer as official pricing until a SiamEZ staff member reviews and approves them.";

const SELL_CRITICAL_FIELDS: { key: string; label: string }[] = [
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "year", label: "Year" },
  { key: "mileageKm", label: "Mileage" },
  { key: "province", label: "Province" },
  { key: "askingPrice", label: "Asking price" },
  { key: "overallCondition", label: "Overall condition" },
  { key: "accidentHistory", label: "Accident history" },
  { key: "ownershipStatus", label: "Ownership status" },
];

export function collectMissingSellFields(vehicle: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const field of SELL_CRITICAL_FIELDS) {
    const value = vehicle[field.key];
    if (value == null || value === "" || value === "unknown") missing.push(field.label);
  }
  if (!vehicle.photosCount || Number(vehicle.photosCount) < 3) {
    missing.push("Vehicle photos (at least 3 recommended)");
  }
  return missing;
}

export function scoreLead(input: {
  type: "sell" | "buy";
  missing: string[];
  hasContact: boolean;
  hasPhotos: boolean;
  hasPrice: boolean;
}): { score: VehicleLeadScore; reason: string } {
  if (!input.hasContact) {
    return { score: "low", reason: "No usable phone or LINE contact." };
  }
  const gaps = input.missing.length;
  if (input.type === "sell") {
    if (gaps <= 2 && input.hasPhotos && input.hasPrice) {
      return { score: "high", reason: "Core vehicle details, photos, price, and contact are present." };
    }
    if (gaps <= 5 && (input.hasPhotos || input.hasPrice)) {
      return { score: "medium", reason: "Enough to start review, but some details or photos are missing." };
    }
    return { score: "low", reason: "Too many gaps to quote or list without follow-up." };
  }
  if (gaps <= 2 && input.hasPrice) {
    return { score: "high", reason: "Clear search brief with budget and contact." };
  }
  if (gaps <= 5) {
    return { score: "medium", reason: "Search brief is usable but incomplete." };
  }
  return { score: "low", reason: "Search brief needs more detail before sourcing." };
}

export function buildRuleBasedAnalysis(input: {
  type: "sell" | "buy";
  displayTitle: string;
  vehicle: Record<string, unknown>;
  askingPrice?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  photoCount: number;
  hasContact: boolean;
  recommendedFeeNote: string;
}): VehicleAiAnalysis {
  const vehicle = { ...input.vehicle, photosCount: input.photoCount } as Record<string, unknown> & {
    photosCount: number;
  };
  const missing =
    input.type === "sell"
      ? collectMissingSellFields(vehicle)
      : [
          !vehicle.make ? "Preferred make" : null,
          !vehicle.model ? "Preferred model" : null,
          input.budgetMax == null ? "Budget maximum" : null,
          !vehicle.province ? "Preferred province" : null,
        ].filter((v): v is string => Boolean(v));

  const { score, reason } = scoreLead({
    type: input.type,
    missing,
    hasContact: input.hasContact,
    hasPhotos: input.photoCount > 0,
    hasPrice: input.type === "sell" ? input.askingPrice != null : input.budgetMax != null,
  });

  const concerns: string[] = [];
  if (vehicle.accidentHistory === "yes") concerns.push("Customer reported accident history.");
  if (vehicle.floodDamage === "yes") concerns.push("Customer reported flood damage.");
  if (vehicle.outstandingFinance && String(vehicle.outstandingFinance).toLowerCase() !== "no") {
    concerns.push("Possible outstanding finance or loan — confirm before listing.");
  }
  if (input.photoCount === 0 && input.type === "sell") {
    concerns.push("No photos uploaded; visual condition cannot be assessed.");
  }

  const summary =
    input.type === "sell"
      ? `${input.displayTitle} submitted for sale. Only customer-supplied details were used; unspecified items are listed as missing.`
      : `Customer wants help finding ${input.displayTitle}. Search criteria below are limited to what they provided.`;

  return {
    vehicleSummary: summary,
    estimatedMarketMin: null,
    estimatedMarketMax: null,
    suggestedListingPrice: null,
    suggestedMinAcceptable: null,
    conditionAssessment:
      input.type === "sell"
        ? String(vehicle.overallCondition || "Not provided. Do not assume condition.")
        : "Not applicable for a buy/search request.",
    missingInformation: missing,
    potentialConcerns: concerns,
    recommendedService: input.recommendedFeeNote,
    recommendedNextAction:
      input.type === "sell"
        ? "Review photos and documents, confirm ownership/tax status, then contact the customer with next steps."
        : "Confirm budget and must-haves, then shortlist matching vehicles for the customer.",
    leadQualityScore: score,
    leadQualityReason: reason,
    estimatesDisclaimer: PRICE_ESTIMATE_DISCLAIMER,
    isEstimate: true,
    source: "rules",
  };
}
