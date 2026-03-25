"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { signOut } from "@/auth";
import { getUserByEmail } from "@/data-access/user";
import { linkGuestCasesToUser } from "@/data-access/case";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function register(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, password, name } = parsed.data;
  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: { email: ["This email is already registered."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name.trim(),
      passwordHash,
      role: "customer",
    },
  });

  await linkGuestCasesToUser(email, newUser.id);

  // Session cookie must be set via client `signIn()` (see LoginForm) — Server Action
  // signIn does not reliably forward Set-Cookie on Next.js 15+.
  return { ok: true as const };
}

export async function logout() {
  await signOut({ redirect: false });
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
