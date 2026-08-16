/**
 * AI requirement extraction for the booking quote engine.
 * Returns validated structured data only — never prices.
 */

import { z } from "zod";
import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import { getServicePricingConfig } from "@/config/pricing";
import type { WizardFieldConfig } from "@/config/wizards/types";

export const QuoteRequirementsSchema = z.object({
  serviceId: z.string().min(1),
  requirements: z.record(z.string(), z.unknown()),
  missingQuestions: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().optional(),
});

export type QuoteRequirementsExtraction = z.infer<typeof QuoteRequirementsSchema>;

function questionCatalog(fields: WizardFieldConfig[]): string {
  return fields
    .map((f) => {
      const opts = f.options?.map((o) => o.value).join("|") ?? "";
      return `- ${f.name} (${f.type}${f.required ? ", required" : ""})${opts ? `: ${opts}` : ""} — ${f.label}`;
    })
    .join("\n");
}

function ruleBasedExtract(input: {
  serviceSlug: string;
  message: string;
  currentRequirements?: Record<string, unknown>;
}): QuoteRequirementsExtraction | null {
  const config = getServicePricingConfig(input.serviceSlug);
  if (!config) return null;

  const text = input.message.toLowerCase();
  const requirements: Record<string, unknown> = {
    ...(input.currentRequirements ?? {}),
  };

  // Lightweight heuristics for driver-license (soft-launch MVP fallback)
  if (input.serviceSlug === "driver-license") {
    if (/convert|conversion|foreign/.test(text)) requirements.category = "conversion";
    else if (/renew/.test(text)) requirements.category = "renewal";
    else if (/new license|apply/.test(text)) requirements.category = "apply_new";
    else if (/\bidp\b|international driving/.test(text)) requirements.category = "idp";

    if (/motor|bike|scooter/.test(text)) requirements.vehicleType = "bike";
    else if (/car|automobile/.test(text)) requirements.vehicleType = "car";
    else if (/both/.test(text)) requirements.vehicleType = "both";

    if (/canadian|canada/.test(text)) requirements.nationality = "Canadian";
    if (/american|usa|united states/.test(text)) requirements.nationality = "American";
    if (/british|uk|united kingdom/.test(text)) requirements.nationality = "British";
    if (/australian|australia/.test(text)) requirements.nationality = "Australian";

    if (/translat/.test(text)) requirements.addonTranslationLetter = true;
    if (/residential|address.?cert|house.?book|yellow.?book/.test(text)) {
      requirements.addonAddressCertificate = true;
    }
  }

  if (input.serviceSlug === "basic-translation" || input.serviceSlug === "translation-services") {
    const pages = text.match(/(\d+)\s*pages?/);
    if (pages) requirements.pageCount = Number(pages[1]);
    if (/certified/.test(text)) requirements.certified = true;
    if (/express|urgent/.test(text)) requirements.express = true;
    if (/legaliz|mfa/.test(text)) requirements.mfaLegalization = true;
  }

  const missing = config.questions
    .filter((q) => {
      if (q.showWhen) {
        // Keep simple: still ask if not answered
      }
      if (!q.required) return false;
      const v = requirements[q.name];
      return v === undefined || v === null || v === "";
    })
    .map((q) => q.name);

  return {
    serviceId: input.serviceSlug,
    requirements,
    missingQuestions: missing,
    confidence: "low",
    notes: "Extracted without LLM (rule fallback)",
  };
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Invalid AI response: no JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Extract structured service requirements from free-text.
 * Rejects malformed AI output. Never returns pricing fields.
 */
export async function extractQuoteRequirements(input: {
  serviceSlug: string;
  message: string;
  currentRequirements?: Record<string, unknown>;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<{
  ok: true;
  data: QuoteRequirementsExtraction;
  source: "llm" | "rules";
} | {
  ok: false;
  error: string;
  fallback?: QuoteRequirementsExtraction;
}> {
  const pricing = getServicePricingConfig(input.serviceSlug);
  if (!pricing) {
    return { ok: false, error: "Service pricing configuration not found" };
  }

  const ruleFallback = ruleBasedExtract(input);

  if (!isConciergeLlmConfigured()) {
    if (ruleFallback) {
      return { ok: true, data: ruleFallback, source: "rules" };
    }
    return {
      ok: false,
      error:
        "We're having trouble processing your request. You can continue with our standard booking form or contact SiamEZ.",
    };
  }

  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) {
    if (ruleFallback) return { ok: true, data: ruleFallback, source: "rules" };
    return { ok: false, error: "AI unavailable" };
  }

  const system = [
    "You are the SiamEZ AI Concierge requirement extractor.",
    "Return ONLY valid JSON matching the schema. Never include prices, fees, or totals.",
    "Never invent government fees, legal requirements, or processing times.",
    "Map the customer message into known question field names and allowed option values.",
    "List any still-missing required question field names in missingQuestions.",
    "",
    `Service: ${input.serviceSlug}`,
    `Hint: ${pricing.conciergeHint ?? ""}`,
    "Questions:",
    questionCatalog(pricing.questions),
    "",
    "JSON schema:",
    JSON.stringify({
      serviceId: "string (service slug)",
      requirements: { fieldName: "value" },
      missingQuestions: ["fieldName"],
      confidence: "high|medium|low",
      notes: "optional short note",
    }),
  ].join("\n");

  const messages = [
    { role: "system" as const, content: system },
    ...(input.history ?? []).slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user" as const,
      content: JSON.stringify({
        message: input.message,
        currentRequirements: input.currentRequirements ?? {},
      }),
    },
  ];

  try {
    const res = await fetch(getConciergeLlmEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getConciergeModel(),
        temperature: 0,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!res.ok) {
      if (ruleFallback) return { ok: true, data: ruleFallback, source: "rules" };
      return {
        ok: false,
        error:
          "We're having trouble processing your request. You can continue with our standard booking form or contact SiamEZ.",
        fallback: ruleFallback ?? undefined,
      };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty AI response");
    }

    const parsed = extractJsonObject(content);
    const validated = QuoteRequirementsSchema.safeParse({
      ...(parsed as object),
      serviceId: input.serviceSlug,
    });

    if (!validated.success) {
      if (ruleFallback) return { ok: true, data: ruleFallback, source: "rules" };
      return {
        ok: false,
        error: "Invalid AI response",
        fallback: undefined,
      };
    }

    // Strip any accidental pricing keys the model might add
    const cleanedReqs: Record<string, unknown> = {
      ...(input.currentRequirements ?? {}),
      ...validated.data.requirements,
    };
    for (const key of Object.keys(cleanedReqs)) {
      if (/price|fee|total|amount|cost|thb|satang/i.test(key)) {
        delete cleanedReqs[key];
      }
    }

    return {
      ok: true,
      data: {
        ...validated.data,
        requirements: cleanedReqs,
      },
      source: "llm",
    };
  } catch {
    if (ruleFallback) return { ok: true, data: ruleFallback, source: "rules" };
    return {
      ok: false,
      error:
        "We're having trouble processing your request. You can continue with our standard booking form or contact SiamEZ.",
    };
  }
}
