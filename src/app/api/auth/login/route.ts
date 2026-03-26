import { NextRequest } from "next/server";
import * as bcrypt from "bcryptjs";
import { getUserByEmail } from "@/data-access/user";
import { createApiJwtForUser } from "@/lib/auth/api-jwt";
import { ok, fail } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    const user = await getUserByEmail(email);
    if (!user?.passwordHash) {
      return fail("Invalid credentials", 401);
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return fail("Invalid credentials", 401);
    }

    const token = await createApiJwtForUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return ok({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Login failed", 500);
  }
}
