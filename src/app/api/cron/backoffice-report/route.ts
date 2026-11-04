import { NextRequest, NextResponse } from "next/server";
import { publishDailyReport } from "@/lib/backoffice/report";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization")?.trim() !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const kind = request.nextUrl.searchParams.get("kind") === "eod" ? "eod" : "morning";
  try {
    const result = await publishDailyReport(kind);
    return NextResponse.json({ ok: true, kind, ...result });
  } catch (error) {
    console.error("[backoffice-report]", error);
    return NextResponse.json({ error: "Report failed" }, { status: 500 });
  }
}
