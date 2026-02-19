"use server";

import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getUserByEmail } from "@/data-access/user";
import { setSession, destroySession } from "@/lib/session";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
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
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name.trim(),
      passwordHash,
      role: "customer",
    },
  });

  await setSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.image,
  });

  const locale = await getLocale();
  nextRedirect(`/${locale}/portal`);
}

export async function login(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email.toLowerCase());
  if (!user?.passwordHash) {
    return { error: { email: ["Invalid email or password."] } };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: { email: ["Invalid email or password."] } };
  }

  if (!user.active) {
    return { error: { email: ["Account is disabled. Contact support."] } };
  }

  await setSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.image,
  });

  const locale = await getLocale();
  nextRedirect(`/${locale}/portal`);
}

export async function logout() {
  await destroySession();
  const locale = await getLocale();
  nextRedirect(`/${locale}/login`);
}
