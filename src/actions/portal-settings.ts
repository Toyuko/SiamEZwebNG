"use server";

import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { notificationPreferencesSchema } from "@/lib/notification-preferences";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

const profileSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(40),
  image: z.string().max(2048),
  timezone: z.string().max(64),
  preferredLocale: z.enum(["en", "th"]),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

function normalizeOptional(s: string | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

function normalizeImageUrl(s: string | undefined): string | null {
  const t = s?.trim();
  if (!t) return null;
  try {
    return new URL(t).href;
  } catch {
    return null;
  }
}

export async function updatePortalProfile(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const parsed = profileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    image: String(formData.get("image") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    preferredLocale: formData.get("preferredLocale"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, phone, image, timezone, preferredLocale } = parsed.data;
  const imageUrl = normalizeImageUrl(image);
  if (image?.trim() && !imageUrl) {
    return { error: "Invalid profile image URL." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      phone: normalizeOptional(phone),
      image: imageUrl,
      timezone: normalizeOptional(timezone),
      preferredLocale,
    },
  });

  return { ok: true as const };
}

export async function updateNotificationSettings(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const raw = {
    emailCaseUpdates: formData.get("emailCaseUpdates") === "on",
    emailInvoiceReminders: formData.get("emailInvoiceReminders") === "on",
    emailDocumentAlerts: formData.get("emailDocumentAlerts") === "on",
    emailMarketing: formData.get("emailMarketing") === "on",
  };

  const parsed = notificationPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid notification preferences." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPreferences: parsed.data },
  });

  return { ok: true as const };
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  if (newPassword === currentPassword) {
    return { error: "New password must be different from your current password." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.passwordHash) {
    return { error: "Password sign-in is not enabled for this account." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { ok: true as const };
}

export async function deactivateAccount(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const confirm = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  const email = session.user.email?.toLowerCase() ?? "";

  if (!confirm || confirm !== email) {
    return { error: "Type your email exactly to confirm." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { active: false },
  });

  const locale = await getLocale();
  await signOut({ redirect: false });
  redirect(`/${locale}/login`);
}
