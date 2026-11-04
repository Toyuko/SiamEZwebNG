import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { BackofficeError, backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { canConfigureAutomations } from "@/lib/backoffice/permissions";
import { automationDashboard, setAutomationEnabled } from "@/lib/backoffice/workflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireBackofficeActor();
    return ok(await automationDashboard());
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

const patchSchema = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    if (!canConfigureAutomations(actor.role)) throw new BackofficeError("Only an administrator can change automations.", 403);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    await setAutomationEnabled(parsed.data.key, parsed.data.enabled, actor.id);
    return ok(await automationDashboard());
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
