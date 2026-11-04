import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import { CLASSIFIER_INSTRUCTIONS, parseClassifierJson, type BackofficeIntent } from "@/lib/backoffice/intent";
import { wrapUntrusted } from "@/lib/backoffice/sanitize";

export function backofficeModelName(): string | null {
  return isConciergeLlmConfigured() ? getConciergeModel() : null;
}

export async function classifyWithModel(message: string): Promise<BackofficeIntent | null> {
  const key = getConciergeLlmApiKey();
  if (!key || !isConciergeLlmConfigured()) return null;
  try {
    const response = await fetch(getConciergeLlmEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getConciergeModel(),
        temperature: 0,
        messages: [
          { role: "system", content: CLASSIFIER_INSTRUCTIONS },
          { role: "user", content: wrapUntrusted("staff-message", message) },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return parseClassifierJson(JSON.parse(content.slice(start, end + 1)), message);
  } catch {
    return null;
  }
}
