/**
 * AI Concierge runtime config.
 * LLM calls stay server-side; clients only receive a boolean capability flag.
 */

export function hasOpenAiApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hasAiGatewayKey(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_AI_GATEWAY_API_KEY?.trim()
  );
}

/** True when an LLM provider can be used for concierge replies. */
export function isConciergeLlmConfigured(): boolean {
  return hasOpenAiApiKey() || hasAiGatewayKey();
}

export function getConciergeLlmEndpoint(): string {
  if (hasAiGatewayKey()) {
    return (
      process.env.AI_GATEWAY_URL?.trim() ||
      "https://ai-gateway.vercel.sh/v1/chat/completions"
    );
  }
  return (
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1/chat/completions"
  );
}

export function getConciergeLlmApiKey(): string | null {
  return (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

export function getConciergeModel(): string {
  return process.env.AI_CONCIERGE_MODEL?.trim() || "gpt-4o-mini";
}

export const CONCIERGE_SESSION_STORAGE_KEY = "siamez.concierge.session.v1";
export const CONCIERGE_SESSION_ID_KEY = "siamez.concierge.sessionId.v1";
