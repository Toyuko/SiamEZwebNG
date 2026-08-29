"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { getUserByEmail } from "@/data-access/user";
import { linkGuestCasesToUser } from "@/data-access/case";
import { ensureFreelancerProfile } from "@/data-access/freelancer";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/messages";
import {
  displayNameFromEmail,
  resolvePublicRegistrationRole,
} from "@/lib/auth/public-registration";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().max(120).optional(),
});

export async function register(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;
  const name = parsed.data.name?.trim() || displayNameFromEmail(email);
  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: { email: ["This email is already registered."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = resolvePublicRegistrationRole(formData.get("accountType")?.toString());

  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
    },
  });

  await linkGuestCasesToUser(email, newUser.id);

  if (role === "freelancer") {
    await ensureFreelancerProfile(newUser.id);
  }

  sendWelcomeEmail({
    to: newUser.email,
    name: newUser.name,
    role,
  });

  // Session cookie must be set via client `signIn()` (see LoginForm) — Server Action
  // signIn does not reliably forward Set-Cookie on Next.js 15+.
  return { ok: true as const, role };
}

/**
 * First-run profile completion for customers (A04).
 * Additive only — does not change JWT/session claim shape.
 * Ongoing profile editing remains in portal-settings (A08).
 */
const firstRunProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().min(6, "Phone is required").max(40),
  preferredLocale: z.enum(["en", "th"]).default("en"),
});

export async function completeFirstRunProfile(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not signed in." };
  }

  const parsed = firstRunProfileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    preferredLocale: formData.get("preferredLocale") ?? "en",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "customer") {
    return { error: "Only customers can complete this step." };
  }

  const { name, phone, preferredLocale } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      preferredLocale,
    },
  });

  return { ok: true as const };
}

export async function logout() {
  await signOut({ redirect: false });
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
