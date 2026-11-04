import { ZodError } from "zod";
import { fail } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { canUseBackoffice } from "@/lib/backoffice/permissions";
import type { BackofficeActor } from "@/lib/backoffice/types";

export class BackofficeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function requireBackofficeActor(): Promise<BackofficeActor> {
  if (isAdminAuthBypassEnabled()) {
    const session = await getSession();
    if (session && canUseBackoffice(session.user.role)) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role === "admin" ? "admin" : "staff",
        bypass: true,
      };
    }
    return {
      id: null,
      email: "local-dev@siamez.invalid",
      name: "Local development",
      role: "admin",
      bypass: true,
    };
  }

  const session = await getSession();
  if (!session) throw new BackofficeError("Sign in required.", 401);
  if (!canUseBackoffice(session.user.role)) {
    throw new BackofficeError("This assistant is only available to SiamEZ staff.", 403);
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role === "admin" ? "admin" : "staff",
    bypass: false,
  };
}

export function backofficeErrorResponse(error: unknown) {
  if (error instanceof BackofficeError) return fail(error.message, error.status);
  if (error instanceof ZodError) return fail(error.issues[0]?.message ?? "Invalid action.", 400);
  console.error("[backoffice]", error);
  return fail("The assistant could not complete that request.", 500);
}
