import { NextRequest, NextResponse } from "next/server";
import { autoApproveStaleCompletedJobs } from "@/lib/jobs/auto-approve";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approvedCount = await autoApproveStaleCompletedJobs();
  return NextResponse.json({ ok: true, approvedCount });
}
