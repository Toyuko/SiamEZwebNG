"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { signOut } from "@/auth";
import { getUserByEmail } from "@/data-access/user";
import { linkGuestCasesToUser } from "@/data-access/case";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  accountType: z.enum(["customer", "freelancer", "company"]).default("customer"),
});

async function uniqueCompanySlug(baseName: string): Promise<string> {
  const base = toSlug(baseName) || "company";
  let slug = base;
  let attempt = 0;
  while (await prisma.company.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export async function register(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    accountType: formData.get("accountType") ?? "customer",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, password, name, accountType } = parsed.data;
  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: { email: ["This email is already registered."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role =
    accountType === "freelancer"
      ? "freelancer"
      : accountType === "company"
        ? "company"
        : "customer";

  const companyName = name.trim();
  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: companyName,
      passwordHash,
      role,
      ...(role === "freelancer"
        ? { freelancerProfile: { create: {} } }
        : role === "company"
          ? {
              company: {
                create: {
                  companyName,
                  slug: await uniqueCompanySlug(companyName),
                },
              },
            }
          : {}),
    },
  });

  if (role === "customer") {
    await linkGuestCasesToUser(email, newUser.id);
  }

  // Session cookie must be set via client `signIn()` (see LoginForm) — Server Action
  // signIn does not reliably forward Set-Cookie on Next.js 15+.
  return { ok: true as const, role };
}

export async function logout() {
  await signOut({ redirect: false });
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
