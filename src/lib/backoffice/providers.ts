import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import { openSecret, type StoredProvider } from "@/lib/backoffice/provider-seal";

export { assertProviderUrl, openSecret, sealSecret, toPublicProvider } from "@/lib/backoffice/provider-seal";
export type { PublicProvider, StoredProvider } from "@/lib/backoffice/provider-seal";

export const AI_TASKS = ["classify", "writing", "reasoning", "documents", "analysis"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const PROVIDER_PRESETS = [
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-chat" },
  { id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  { id: "groq", label: "Groq (Llama)", baseUrl: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  { id: "qwen", label: "Qwen", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" },
  { id: "ollama", label: "Ollama (local)", baseUrl: "http://127.0.0.1:11434/v1/chat/completions", model: "llama3.1" },
  { id: "custom", label: "Custom OpenAI-compatible", baseUrl: "", model: "" },
] as const;

const SETTINGS_KEY = "backoffice.ai.v1";

export type AiSettings = {
  defaultProviderId: string | null;
  fallbackProviderId: string | null;
  tasks: Record<AiTask, string | null>;
  providers: StoredProvider[];
  disabledTools: string[];
};

export function emptyAiSettings(): AiSettings {
  return {
    defaultProviderId: null,
    fallbackProviderId: null,
    tasks: { classify: null, writing: null, reasoning: null, documents: null, analysis: null },
    providers: [],
    disabledTools: [],
  };
}

export function aiSecretsKey(): string | null {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || null;
}

function asSettings(value: unknown): AiSettings {
  const base = emptyAiSettings();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<AiSettings>;
  const tasks = raw.tasks ?? base.tasks;
  return {
    defaultProviderId: typeof raw.defaultProviderId === "string" ? raw.defaultProviderId : null,
    fallbackProviderId: typeof raw.fallbackProviderId === "string" ? raw.fallbackProviderId : null,
    tasks: {
      classify: typeof tasks.classify === "string" ? tasks.classify : null,
      writing: typeof tasks.writing === "string" ? tasks.writing : null,
      reasoning: typeof tasks.reasoning === "string" ? tasks.reasoning : null,
      documents: typeof tasks.documents === "string" ? tasks.documents : null,
      analysis: typeof tasks.analysis === "string" ? tasks.analysis : null,
    },
    providers: Array.isArray(raw.providers) ? raw.providers.filter(isStoredProvider) : [],
    disabledTools: Array.isArray(raw.disabledTools) ? raw.disabledTools.filter((item): item is string => typeof item === "string") : [],
  };
}

function isStoredProvider(value: unknown): value is StoredProvider {
  if (!value || typeof value !== "object") return false;
  const row = value as StoredProvider;
  return typeof row.id === "string" && typeof row.baseUrl === "string" && typeof row.model === "string" && typeof row.enabled === "boolean";
}

export async function loadAiSettings(): Promise<AiSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  return asSettings(row?.value);
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: settings as Prisma.InputJsonValue },
    update: { value: settings as Prisma.InputJsonValue },
  });
}

export function isToolEnabled(settings: AiSettings, toolName: string): boolean {
  return !settings.disabledTools.includes(toolName);
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function completeChat(task: AiTask, messages: ChatMessage[]): Promise<{ text: string; provider: string } | null> {
  const settings = await loadAiSettings().catch(() => emptyAiSettings());
  const secret = aiSecretsKey();
  const chain = providerChain(settings, task);
  for (const provider of chain) {
    const key = provider.sealedKey && secret ? openSecret(provider.sealedKey, secret) : null;
    const text = await postChat(provider.baseUrl, provider.model, key, messages);
    if (text) return { text, provider: provider.label };
  }
  if (!isConciergeLlmConfigured()) return null;
  const text = await postChat(getConciergeLlmEndpoint(), getConciergeModel(), getConciergeLlmApiKey(), messages);
  return text ? { text, provider: "Environment default" } : null;
}

export async function hasAnyModel(): Promise<boolean> {
  const settings = await loadAiSettings().catch(() => emptyAiSettings());
  if (settings.providers.some((item) => item.enabled && (Boolean(item.sealedKey) || isLocalModel(item.baseUrl)))) return true;
  return isConciergeLlmConfigured();
}

function isLocalModel(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function providerChain(settings: AiSettings, task: AiTask): StoredProvider[] {
  const byId = new Map(settings.providers.filter((item) => item.enabled).map((item) => [item.id, item]));
  const ids = [settings.tasks[task], settings.defaultProviderId, settings.fallbackProviderId];
  const seen = new Set<string>();
  const chain: StoredProvider[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const provider = byId.get(id);
    if (provider) chain.push(provider);
  }
  return chain;
}

async function postChat(url: string, model: string, key: string | null, messages: ChatMessage[]): Promise<string | null> {
  if (!model || !url) return null;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, temperature: 0, messages }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}
