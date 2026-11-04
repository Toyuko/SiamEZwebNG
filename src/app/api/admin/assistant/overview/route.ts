import { ok } from "@/lib/api-response";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { ensureBackofficeCatalogue } from "@/lib/backoffice/catalogue";
import { ensureAutomationCatalogue } from "@/lib/backoffice/workflow";
import { backofficeModelName } from "@/lib/backoffice/llm";
import { hasAnyModel, loadAiSettings } from "@/lib/backoffice/providers";
import { getOperationsSnapshot } from "@/lib/backoffice/records";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireBackofficeActor();
    await ensureBackofficeCatalogue();
    await ensureAutomationCatalogue();
    const settings = await loadAiSettings();
    const selected = settings.providers.find((item) => item.id === settings.defaultProviderId);
    const snapshot = await getOperationsSnapshot("morning");
    return ok({
      role: actor.role,
      llmConfigured: await hasAnyModel(),
      model: selected?.model ?? backofficeModelName(),
      snapshot,
    });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
