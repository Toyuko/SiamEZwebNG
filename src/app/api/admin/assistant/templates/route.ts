import { ok } from "@/lib/api-response";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { SALES_TEMPLATES } from "@/lib/backoffice/sales-templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireBackofficeActor();
    return ok({ templates: SALES_TEMPLATES });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
