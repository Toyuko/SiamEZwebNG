import { ok } from "@/lib/api-response";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { ensureBackofficeCatalogue } from "@/lib/backoffice/catalogue";
import { backofficeModelName } from "@/lib/backoffice/llm";
import { getOperationsSnapshot } from "@/lib/backoffice/records";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireBackofficeActor();
    await ensureBackofficeCatalogue();
    const snapshot = await getOperationsSnapshot("morning");
    return ok({
      role: actor.role,
      llmConfigured: Boolean(backofficeModelName()),
      model: backofficeModelName(),
      snapshot,
    });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
