import { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth/getApiUser";
import { getUserCaseById } from "@/lib/domain/cases";
import { ok, fail } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getApiUser(request);
    const { id } = await params;
    const caseRecord = await getUserCaseById(userId, id);
    if (!caseRecord) {
      return fail("Case not found", 404);
    }
    return ok(caseRecord);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch case";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
