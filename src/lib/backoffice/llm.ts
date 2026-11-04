import { completeChat } from "@/lib/backoffice/providers";
import { CLASSIFIER_INSTRUCTIONS, parseClassifierJson, type BackofficeIntent } from "@/lib/backoffice/intent";
import { wrapUntrusted } from "@/lib/backoffice/sanitize";
import { isConciergeLlmConfigured, getConciergeModel } from "@/lib/ai/config";

export function backofficeModelName(): string | null {
  return isConciergeLlmConfigured() ? getConciergeModel() : null;
}

export async function classifyWithModel(message: string): Promise<BackofficeIntent | null> {
  try {
    const result = await completeChat("classify", [
      { role: "system", content: CLASSIFIER_INSTRUCTIONS },
      { role: "user", content: wrapUntrusted("staff-message", message) },
    ]);
    if (!result) return null;
    const start = result.text.indexOf("{");
    const end = result.text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return parseClassifierJson(JSON.parse(result.text.slice(start, end + 1)), message);
  } catch {
    return null;
  }
}
