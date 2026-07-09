"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  isFreelancerSlugAvailable,
  upsertFreelancerPublicProfile,
  serializeOwnerProfile,
  getFreelancerProfileByUserId,
} from "@/data-access/freelancer";
import {
  freelancerProfileUpdateSchema,
  RESERVED_FREELANCER_SLUGS,
  normalizeSlug,
} from "@/lib/freelancer-profile";
import { prisma } from "@/lib/db";

export type FreelancerProfileActionState =
  | { ok: true; profile: ReturnType<typeof serializeOwnerProfile> }
  | { ok: false; error: string };

export async function updateFreelancerPublicProfile(
  _prev: unknown,
  formData: FormData
): Promise<FreelancerProfileActionState> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, active: true },
  });
  if (!user?.active) return { ok: false, error: "Not signed in." };
  if (user.role !== "freelancer" && user.role !== "customer") {
    return { ok: false, error: "Only customers and freelancers can create a public profile." };
  }

  let skills: string[] = [];
  const skillsRaw = String(formData.get("skills") ?? "");
  try {
    const parsedSkills = JSON.parse(skillsRaw);
    if (Array.isArray(parsedSkills)) {
      skills = parsedSkills.filter((s): s is string => typeof s === "string");
    }
  } catch {
    skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  let services: unknown[] = [];
  try {
    const parsedServices = JSON.parse(String(formData.get("services") ?? "[]"));
    if (Array.isArray(parsedServices)) services = parsedServices;
  } catch {
    return { ok: false, error: "Invalid services data." };
  }

  const hourlyRaw = String(formData.get("hourlyRate") ?? "").trim();
  let hourlyRate: number | null = null;
  if (hourlyRaw) {
    const baht = Number(hourlyRaw);
    if (!Number.isFinite(baht) || baht < 0) {
      return { ok: false, error: "Hourly rate must be a valid number." };
    }
    hourlyRate = Math.round(baht * 100);
  }

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const parsed = freelancerProfileUpdateSchema.safeParse({
    slug,
    isPublic: formData.get("isPublic") === "true" || formData.get("isPublic") === "on",
    title: String(formData.get("title") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    skills,
    hourlyRate,
    services: services.map((s) => {
      const row = s as Record<string, unknown>;
      const priceBaht =
        typeof row.priceBaht === "number"
          ? row.priceBaht
          : typeof row.priceBaht === "string" && row.priceBaht.trim()
            ? Number(row.priceBaht)
            : null;
      const priceSatang =
        typeof row.price === "number"
          ? row.price
          : priceBaht != null && Number.isFinite(priceBaht)
            ? Math.round(priceBaht * 100)
            : null;
      return {
        title: row.title,
        description: row.description ?? "",
        price: priceSatang,
        currency: row.currency ?? "THB",
      };
    }),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  if (RESERVED_FREELANCER_SLUGS.has(parsed.data.slug)) {
    return { ok: false, error: "This username is reserved. Please choose another." };
  }

  const available = await isFreelancerSlugAvailable(parsed.data.slug, session.user.id);
  if (!available) {
    return { ok: false, error: "That username is already taken." };
  }

  try {
    const profile = await upsertFreelancerPublicProfile(session.user.id, parsed.data);
    revalidatePath("/portal/freelancer");
    revalidatePath("/portal/freelancer-profile");
    revalidatePath("/portal/profile");
    revalidatePath("/freelancers");
    if (profile.slug) revalidatePath(`/freelancers/${profile.slug}`);
    return { ok: true, profile: serializeOwnerProfile(profile) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save profile.";
    return { ok: false, error: message };
  }
}

export async function getMyFreelancerProfileForPage() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const profile = await getFreelancerProfileByUserId(session.user.id);
  return {
    user: session.user,
    profile: profile ? serializeOwnerProfile(profile) : null,
  };
}
