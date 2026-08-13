import { z } from "zod";
import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import {
  PRICE_ESTIMATE_DISCLAIMER,
  buildRuleBasedAnalysis,
  type VehicleAiAnalysis,
} from "@/lib/vehicle-leads/analysis";
import type { VehicleServicePricing } from "@/lib/vehicle-leads/pricing";
import { computeVehicleServiceFee } from "@/lib/vehicle-leads/pricing";

const analysisSchema = z.object({
  vehicleSummary: z.string().min(1).max(2000),
  estimatedMarketMin: z.number().int().nonnegative().nullable(),
  estimatedMarketMax: z.number().int().nonnegative().nullable(),
  suggestedListingPrice: z.number().int().nonnegative().nullable(),
  suggestedMinAcceptable: z.number().int().nonnegative().nullable(),
  conditionAssessment: z.string().min(1).max(2000),
  missingInformation: z.array(z.string().max(200)).max(30),
  potentialConcerns: z.array(z.string().max(400)).max(20),
  recommendedService: z.string().max(500),
  recommendedNextAction: z.string().max(500),
  leadQualityScore: z.enum(["high", "medium", "low"]),
  leadQualityReason: z.string().max(400),
});

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid AI response: no JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}

function feeNote(type: "sell" | "buy", pricing: VehicleServicePricing, price: number | null): string {
  const fee = computeVehicleServiceFee({ type, vehiclePriceBaht: price, pricing });
  if (fee.total <= 0 && fee.baseFee <= 0 && fee.commission <= 0) {
    return "SiamEZ vehicle service fee to be confirmed by staff from admin-configured pricing.";
  }
  return `Recommended SiamEZ ${type === "sell" ? "selling" : "sourcing"} fee (from configured pricing, not a quote): ฿${fee.total.toLocaleString("en-US")}.`;
}

export async function analyzeVehicleLead(input: {
  type: "sell" | "buy";
  displayTitle: string;
  vehicle: Record<string, unknown>;
  askingPrice?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  photoCount: number;
  hasContact: boolean;
  pricing: VehicleServicePricing;
}): Promise<VehicleAiAnalysis> {
  const recommendedFeeNote = feeNote(
    input.type,
    input.pricing,
    input.type === "sell" ? input.askingPrice ?? null : input.budgetMax ?? null
  );
  const fallback = buildRuleBasedAnalysis({ ...input, recommendedFeeNote });

  if (!isConciergeLlmConfigured()) return fallback;
  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) return fallback;

  const system = [
    "You are a SiamEZ internal vehicle-lead analyst for Thailand (cars and motorcycles).",
    "Return ONLY valid JSON matching the schema.",
    "Use ONLY facts present in the submitted data. Never invent specifications, condition, ownership, accident history, or features.",
    "If a fact is missing, list it in missingInformation and do not guess.",
    "Price fields are whole THB baht integers, or null when you cannot estimate from the supplied facts.",
    "Any price you output is an internal estimate only — never a guaranteed market value.",
    "Do not include customer name, phone, LINE ID, email, or document numbers.",
    PRICE_ESTIMATE_DISCLAIMER,
  ].join("\n");

  try {
    const res = await fetch(getConciergeLlmEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getConciergeModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              type: input.type,
              displayTitle: input.displayTitle,
              vehicle: input.vehicle,
              askingPrice: input.askingPrice ?? null,
              budgetMin: input.budgetMin ?? null,
              budgetMax: input.budgetMax ?? null,
              photoCount: input.photoCount,
              schema: {
                vehicleSummary: "string",
                estimatedMarketMin: "number|null",
                estimatedMarketMax: "number|null",
                suggestedListingPrice: "number|null",
                suggestedMinAcceptable: "number|null",
                conditionAssessment: "string",
                missingInformation: ["string"],
                potentialConcerns: ["string"],
                recommendedService: "string",
                recommendedNextAction: "string",
                leadQualityScore: "high|medium|low",
                leadQualityReason: "string",
              },
            }),
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = analysisSchema.parse(extractJsonObject(content));
    return {
      ...parsed,
      recommendedService: parsed.recommendedService || recommendedFeeNote,
      estimatesDisclaimer: PRICE_ESTIMATE_DISCLAIMER,
      isEstimate: true,
      source: "llm",
    };
  } catch (error) {
    console.warn("[vehicle-leads] AI analysis fallback:", error);
    return fallback;
  }
}

export async function generateCustomerDraft(input: {
  type: "sell" | "buy";
  displayTitle: string;
  locale: "en" | "th";
}): Promise<string> {
  const en =
    input.type === "sell"
      ? `Thanks for submitting your ${input.displayTitle}. We've received your vehicle information and photos. Our team will review the details and current market conditions and get back to you with the next step.`
      : `Thanks for sending your ${input.displayTitle} search request. We've received your requirements. Our team will review what you're looking for and follow up with the next step.`;
  const th =
    input.type === "sell"
      ? `ขอบคุณที่ส่งข้อมูล ${input.displayTitle} เข้ามา เราได้รับรายละเอียดและรูปรถแล้ว ทีมงานจะตรวจสอบข้อมูลและสภาพตลาด แล้วติดต่อกลับเรื่องขั้นตอนถัดไป`
      : `ขอบคุณที่ส่งคำขอค้นหา ${input.displayTitle} เราได้รับความต้องการของคุณแล้ว ทีมงานจะตรวจสอบและติดต่อกลับเรื่องขั้นตอนถัดไป`;
  const fallback = input.locale === "th" ? th : en;

  if (!isConciergeLlmConfigured()) return fallback;
  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) return fallback;

  try {
    const res = await fetch(getConciergeLlmEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getConciergeModel(),
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Write a short, warm SiamEZ customer message. Do not mention prices, guarantees, or timelines unless given. Do not include personal data. Language: " +
              (input.locale === "th" ? "Thai" : "English") +
              ". Return plain text only.",
          },
          { role: "user", content: fallback },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    return content || fallback;
  } catch {
    return fallback;
  }
}
