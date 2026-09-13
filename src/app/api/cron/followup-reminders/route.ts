import { NextRequest, NextResponse } from "next/server";
import { processDueFollowUpReminders } from "@/lib/follow-ups/service";
import { processDueDriverLicenseReminders } from "@/lib/driver-license-renewal/service";
import { syncOverdueStatuses } from "@/lib/follow-ups/queries";

export const dynamic = "force-dynamic";

/**
 * Daily follow-up reminder engine.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader?.trim() !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncOverdueStatuses();
  const followUps = await processDueFollowUpReminders();
  // Legacy / unlinked DL renewals (new ones go through FollowUp)
  const driverLicense = await processDueDriverLicenseReminders();

  return NextResponse.json({
    ok: true,
    followUps,
    driverLicense,
  });
}
