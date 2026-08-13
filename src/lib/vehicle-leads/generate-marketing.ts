import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import {
  buildRuleBasedMarketingPackage,
  type MarketingLanguage,
  type PublicMedia,
  type PublicVehicleFacts,
  type VehicleMarketingPackage,
} from "@/lib/vehicle-leads/marketing";

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid AI response: no JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateVehicleMarketingPackage(input: {
  facts: PublicVehicleFacts;
  language: MarketingLanguage;
  media: PublicMedia[];
}): Promise<VehicleMarketingPackage> {
  const fallback = buildRuleBasedMarketingPackage(input);
  if (!isConciergeLlmConfigured()) return fallback;
  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) return fallback;

  const system = [
    "You generate SiamEZ vehicle marketing copy for Thailand.",
    "Use ONLY the provided vehicle facts. Never invent specs, mileage, condition, accident history, features, or prices.",
    "Never include customer names, phone numbers, LINE IDs, addresses, registration numbers, or document details.",
    "If officialListingPrice is set, use it as the public price. If only askingPrice exists, mark it as not an approved listing price.",
    "Write natural Thai automotive language when language is th or both — not literal translations.",
    "Return JSON with keys: officialTitle, headlines (3-5), sellingPoints, description, facebook {headline,post,hashtags,cta}, instagram {caption,reelCaption,hashtags,cta}, tiktok {script,caption,hashtags,cta}, line {message,cta}, whatsapp {message,cta}, marketplace {title,description,cta}, hashtags.",
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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              facts: input.facts,
              language: input.language,
              fallback,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = extractJsonObject(content) as Partial<VehicleMarketingPackage>;
    return {
      ...fallback,
      ...parsed,
      facebook: { ...fallback.facebook, ...parsed.facebook },
      instagram: { ...fallback.instagram, ...parsed.instagram },
      tiktok: { ...fallback.tiktok, ...parsed.tiktok },
      line: { ...fallback.line, ...parsed.line },
      whatsapp: { ...fallback.whatsapp, ...parsed.whatsapp },
      marketplace: { ...fallback.marketplace, ...parsed.marketplace },
      imageRecommendations: fallback.imageRecommendations,
      priceLabel: fallback.priceLabel,
      priceIsOfficial: fallback.priceIsOfficial,
      language: input.language,
    };
  } catch (error) {
    console.warn("[vehicle-leads] marketing fallback:", error);
    return fallback;
  }
}
