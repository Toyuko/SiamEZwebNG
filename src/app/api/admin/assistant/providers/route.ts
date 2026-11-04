import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { BackofficeError, backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { canConfigureModels } from "@/lib/backoffice/permissions";
import {
  AI_TASKS,
  PROVIDER_PRESETS,
  aiSecretsKey,
  loadAiSettings,
  saveAiSettings,
  sealSecret,
  toPublicProvider,
  type AiSettings,
  type StoredProvider,
} from "@/lib/backoffice/providers";
import { CONFIRMABLE_TOOLS } from "@/lib/backoffice/types";
import { assertProviderUrl } from "@/lib/backoffice/provider-seal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireBackofficeActor();
    const settings = await loadAiSettings();
    return ok(publicSettings(settings));
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

const providerSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(80),
  preset: z.string().min(1).max(40),
  baseUrl: z.string().min(1).max(300),
  model: z.string().min(1).max(120),
  apiKey: z.string().max(500).optional(),
  clearKey: z.boolean().optional(),
  enabled: z.boolean(),
});

const putSchema = z.object({
  providers: z.array(providerSchema).max(12),
  defaultProviderId: z.string().min(1).max(80).nullable(),
  fallbackProviderId: z.string().min(1).max(80).nullable(),
  tasks: z.object({
    classify: z.string().nullable(),
    writing: z.string().nullable(),
    reasoning: z.string().nullable(),
    documents: z.string().nullable(),
    analysis: z.string().nullable(),
  }),
  disabledTools: z.array(z.string()).max(20),
});

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    if (!canConfigureModels(actor.role)) throw new BackofficeError("Only an administrator can change AI models.", 403);
    const parsed = putSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    const current = await loadAiSettings();
    const secret = aiSecretsKey();
    const providers: StoredProvider[] = parsed.data.providers.map((item) => {
      const id = item.id ?? `provider_${item.preset}_${item.model}`.replace(/[^a-z0-9]+/gi, "_").slice(0, 80);
      const previous = current.providers.find((row) => row.id === id);
      let sealedKey = previous?.sealedKey ?? null;
      if (item.clearKey) sealedKey = null;
      if (item.apiKey?.trim()) {
        if (!secret) throw new BackofficeError("Set AUTH_SECRET before storing an AI key.", 409);
        sealedKey = sealSecret(item.apiKey.trim(), secret);
      }
      return {
        id,
        label: item.label,
        preset: item.preset,
        baseUrl: providerUrl(item.baseUrl),
        model: item.model,
        sealedKey,
        enabled: item.enabled,
      };
    });
    const settings: AiSettings = {
      providers,
      defaultProviderId: parsed.data.defaultProviderId,
      fallbackProviderId: parsed.data.fallbackProviderId,
      tasks: parsed.data.tasks,
      disabledTools: parsed.data.disabledTools.filter((tool) => (CONFIRMABLE_TOOLS as readonly string[]).includes(tool)),
    };
    await saveAiSettings(settings);
    return ok(publicSettings(settings));
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

function providerUrl(value: string): string {
  try {
    return assertProviderUrl(value);
  } catch (error) {
    throw new BackofficeError(error instanceof Error ? error.message : "That model address is not allowed.", 400);
  }
}

function publicSettings(settings: AiSettings) {
  return {
    presets: PROVIDER_PRESETS,
    tasks: AI_TASKS,
    tools: CONFIRMABLE_TOOLS,
    defaultProviderId: settings.defaultProviderId,
    fallbackProviderId: settings.fallbackProviderId,
    taskRouting: settings.tasks,
    disabledTools: settings.disabledTools,
    providers: settings.providers.map(toPublicProvider),
  };
}
