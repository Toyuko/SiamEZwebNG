"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { DEFAULT_FLAGS, setFeatureFlag } from "@/lib/feature-flags";

const schema = z.object({
  key: z.enum(Object.keys(DEFAULT_FLAGS) as [keyof typeof DEFAULT_FLAGS, ...(keyof typeof DEFAULT_FLAGS)[]]),
  enabled: z.boolean(),
});

export async function setFeatureFlagAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const session = await requireStaff();
  await setFeatureFlag(parsed.data.key, parsed.data.enabled, session.user.id);
  return { ok: true as const };
}
