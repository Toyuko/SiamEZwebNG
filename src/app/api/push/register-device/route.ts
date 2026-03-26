import { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth/getApiUser";
import { registerPushDevice } from "@/lib/domain/services";
import { ok, fail } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const body = await request.json();

    const token = String(body?.token ?? "").trim();
    const platform = String(body?.platform ?? "").trim();
    if (!token || !platform) {
      return fail("token and platform are required", 400);
    }

    await registerPushDevice({
      userId,
      token,
      platform,
      appVersion: typeof body?.appVersion === "string" ? body.appVersion : undefined,
      deviceId: typeof body?.deviceId === "string" ? body.deviceId : undefined,
    });

    return ok({ registered: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to register device";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
