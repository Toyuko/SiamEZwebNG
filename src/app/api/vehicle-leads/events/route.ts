import { NextResponse } from "next/server";
import { trackPlatformEvent } from "@/lib/analytics/track";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const ALLOWED = new Set([
  "vehicle_form_opened",
  "vehicle_form_started",
  "vehicle_step_completed",
  "vehicle_photo_upload_started",
  "vehicle_photo_upload_completed",
  "vehicle_form_submitted",
]);

export async function POST(request: Request) {
  const rl = checkRateLimit(clientKeyFromRequest(request, "vehicle-events"), 40, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const json = (await request.json()) as { kind?: string; meta?: Record<string, unknown>; locale?: string };
    if (!json.kind || !ALLOWED.has(json.kind)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    void trackPlatformEvent(json.kind, json.meta, undefined, json.locale);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
