import { NextRequest } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { getUserByEmail } from "@/data-access/user";
import { linkGuestCasesToUser } from "@/data-access/case";
import { createApiJwtForUser } from "@/lib/auth/api-jwt";
import { ok, fail } from "@/lib/api-response";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse({
      email: body?.email,
      password: body?.password,
      name: body?.name,
      phone: body?.phone,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Invalid registration payload";
      return fail(firstIssue, 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const name = parsed.data.name.trim();
    const password = parsed.data.password;

    const existing = await getUserByEmail(email);
    if (existing) {
      return fail("This email is already registered.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "customer",
      },
    });

    await linkGuestCasesToUser(email, newUser.id);

    const token = await createApiJwtForUser({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return ok({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Registration failed", 500);
  }
}
