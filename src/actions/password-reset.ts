"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/email/config";
import { sendPasswordResetEmail } from "@/lib/email/messages";
import {
  checkRateLimit,
} from "@/lib/security/rate-limit";

const requestSchema = z.object({
  email: z.string().trim().email().max(200),
  locale: z.enum(["en", "th"]).default("en"),
});

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Always returns a generic success message to avoid email enumeration.
 */
export async function requestPasswordReset(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const parsed = requestSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale") ?? "en",
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_email" };
  }

  const email = parsed.data.email.toLowerCase();
  const rl = checkRateLimit(`password-reset:${email}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, active: true },
  });

  // Only credentials accounts with a password can reset.
  if (user?.passwordHash && user.active) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { identifier: `password-reset:${email}` },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: `password-reset:${email}`,
        token: tokenHash,
        expires,
      },
    });

    const resetUrl = `${getAppBaseUrl()}/${parsed.data.locale}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  }

  return {
    ok: true,
    message: "If an account exists for that email, we sent a reset link.",
  };
}

export async function resetPasswordWithToken(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.verificationToken.findFirst({
    where: {
      token: tokenHash,
      expires: { gt: new Date() },
      identifier: { startsWith: "password-reset:" },
    },
  });

  if (!record) {
    return { ok: false, error: "invalid_or_expired" };
  }

  const email = record.identifier.replace(/^password-reset:/, "");
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, active: true },
  });

  if (!user?.passwordHash || !user.active) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    });
    return { ok: false, error: "invalid_or_expired" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);

  return { ok: true };
}
