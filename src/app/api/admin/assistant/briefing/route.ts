import { ok } from "@/lib/api-response";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { buildBriefing } from "@/lib/backoffice/intelligence";
import { ensureAutomationCatalogue } from "@/lib/backoffice/workflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireBackofficeActor();
    await ensureAutomationCatalogue();
    return ok({ briefing: await buildBriefing(actor.role) });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
