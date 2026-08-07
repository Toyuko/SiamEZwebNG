import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  optionalBearerApiUser,
  requireBearerApiUser,
} from "@/lib/auth/requireBearerApiUser";
import type { MarketplaceListingType } from "@/lib/marketplace-engagement";

export function apiUnauthorized(error = "Unauthorized") {
  return fail(error, 401);
}

export function apiNotFound(error = "Not found") {
  return fail(error, 404);
}

export function apiBadRequest(error: string) {
  return fail(error, 400);
}

export function apiForbidden(error = "Forbidden") {
  return fail(error, 403);
}

export function apiOk(data: unknown, status = 200) {
  return ok(data, status);
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

export async function withBearerUser(
  request: NextRequest,
  handler: (userId: string, role: string) => Promise<Response>
): Promise<Response> {
  try {
    const user = await requireBearerApiUser(request);
    return await handler(user.userId, user.role);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return apiUnauthorized();
    }
    const message = error instanceof Error ? error.message : "Request failed";
    const lower = message.toLowerCase();
    const status =
      lower === "forbidden" || lower.includes("forbidden")
        ? 403
        : lower.includes("not found")
          ? 404
          : lower.includes("required") ||
              lower.includes("invalid") ||
              lower.includes("cannot transition")
            ? 400
            : 500;
    return fail(message, status);
  }
}

export async function withOptionalBearerUser(
  request: NextRequest,
  handler: (userId: string | null) => Promise<Response>
): Promise<Response> {
  try {
    const user = await optionalBearerApiUser(request);
    return await handler(user?.userId ?? null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return fail(message, 500);
  }
}

export function parseListingType(
  value: string | undefined
): MarketplaceListingType | null {
  if (value === "vehicle" || value === "property") return value;
  return null;
}

export function parsePositiveInt(
  value: string | null,
  fallback: number
): number {
  if (value == null || value.trim() === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseOptionalNumber(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** JSON-safe: Dates → ISO strings. */
export function serializeJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v instanceof Date ? v.toISOString() : v
    )
  ) as T;
}
