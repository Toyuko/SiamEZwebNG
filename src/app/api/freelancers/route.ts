import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { listPublicFreelancers } from "@/data-access/freelancer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") ?? undefined;
    const skill = searchParams.get("skill") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "12");

    const result = await listPublicFreelancers({
      q,
      skill,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 12,
    });

    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list freelancers";
    return fail(message, 500);
  }
}
