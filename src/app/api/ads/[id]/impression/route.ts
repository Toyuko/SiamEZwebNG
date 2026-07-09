import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const campaign = await prisma.adCampaign.findFirst({
      where: { id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!campaign) {
      return fail("Campaign not found", 404);
    }

    const updated = await prisma.adCampaign.update({
      where: { id },
      data: { impressions: { increment: 1 } },
      select: { id: true, impressions: true },
    });

    return ok(updated);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to record impression", 500);
  }
}
