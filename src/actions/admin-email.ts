"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { getEmailStatus, sendTestEmail } from "@/lib/email";

export async function getAdminEmailStatus() {
  await requireStaff();
  return getEmailStatus();
}

const testSchema = z.object({
  to: z.string().trim().email().max(200),
});

export async function sendAdminTestEmail(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireStaff();
  const parsed = testSchema.safeParse({ to: formData.get("to") });
  if (!parsed.success) {
    return { ok: false, error: "invalid_email" };
  }

  const result = await sendTestEmail(parsed.data.to);
  if (!result.ok) {
    return {
      ok: false,
      error: result.skipped ? "not_configured" : result.error,
    };
  }
  return { ok: true, id: result.id };
}
