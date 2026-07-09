"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdCampaignStatus, JobApplicationStatus, JobPostingStatus } from "@prisma/client";
import { requireCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";
import { ensureCompany, getCompanyByUserId } from "@/data-access/company";

function normalizeOptional(s: string | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

function normalizeHttpsUrl(s: string | undefined): string | null {
  const t = s?.trim();
  if (!t) return null;
  try {
    const url = new URL(t);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Convert THB major units (form input) to satang. */
function thbToSatang(value: number): number {
  return Math.round(value * 100);
}

async function requireOwnedCompany() {
  const session = await requireCompany();
  const company = await ensureCompany(session.user.id, session.user.name ?? undefined);
  return { session, company };
}

const profileSchema = z.object({
  companyName: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens"),
  logo: z.string().max(2048),
  bannerImage: z.string().max(2048),
  website: z.string().max(2048),
  description: z.string().max(10000),
  industry: z.string().max(120),
  companySize: z.string().max(40),
  taxId: z.string().max(40),
  address: z.string().max(500),
});

export async function updateCompanyProfile(_prev: unknown, formData: FormData) {
  const { company } = await requireOwnedCompany();

  const parsed = profileSchema.safeParse({
    companyName: String(formData.get("companyName") ?? ""),
    slug: toSlug(String(formData.get("slug") ?? "")) || String(formData.get("slug") ?? ""),
    logo: String(formData.get("logo") ?? ""),
    bannerImage: String(formData.get("bannerImage") ?? ""),
    website: String(formData.get("website") ?? ""),
    description: String(formData.get("description") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    companySize: String(formData.get("companySize") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    address: String(formData.get("address") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const logo = normalizeHttpsUrl(data.logo);
  if (data.logo.trim() && !logo) return { error: "Invalid logo URL." };
  const bannerImage = normalizeHttpsUrl(data.bannerImage);
  if (data.bannerImage.trim() && !bannerImage) return { error: "Invalid banner URL." };
  const website = normalizeHttpsUrl(data.website);
  if (data.website.trim() && !website) return { error: "Invalid website URL." };

  const slugTaken = await prisma.company.findFirst({
    where: { slug: data.slug, NOT: { id: company.id } },
    select: { id: true },
  });
  if (slugTaken) {
    return { error: { slug: ["This slug is already taken."] } };
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      companyName: data.companyName.trim(),
      slug: data.slug,
      logo,
      bannerImage,
      website,
      description: normalizeOptional(data.description),
      industry: normalizeOptional(data.industry),
      companySize: normalizeOptional(data.companySize),
      taxId: normalizeOptional(data.taxId),
      address: normalizeOptional(data.address),
    },
  });

  await prisma.user.update({
    where: { id: company.userId },
    data: { name: data.companyName.trim() },
  });

  revalidatePath("/portal/company");
  revalidatePath(`/companies/${data.slug}`);
  if (company.slug !== data.slug) {
    revalidatePath(`/companies/${company.slug}`);
  }

  return { ok: true as const };
}

const jobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  budgetThb: z.coerce.number().positive().max(10_000_000),
  requiredSkills: z.string().max(1000),
});

export async function createJobPosting(_prev: unknown, formData: FormData) {
  const { company } = await requireOwnedCompany();

  const parsed = jobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    budgetThb: formData.get("budgetThb"),
    requiredSkills: String(formData.get("requiredSkills") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const skills = parsed.data.requiredSkills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.jobPosting.create({
    data: {
      companyId: company.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      budget: thbToSatang(parsed.data.budgetThb),
      currency: "THB",
      requiredSkills: skills,
      status: "OPEN",
    },
  });

  revalidatePath("/portal/company");
  revalidatePath(`/companies/${company.slug}`);
  return { ok: true as const };
}

export async function updateJobPostingStatus(jobPostingId: string, status: JobPostingStatus) {
  const { company } = await requireOwnedCompany();

  const posting = await prisma.jobPosting.findFirst({
    where: { id: jobPostingId, companyId: company.id },
  });
  if (!posting) return { error: "Job posting not found." as const };

  await prisma.jobPosting.update({
    where: { id: jobPostingId },
    data: { status },
  });

  revalidatePath("/portal/company");
  revalidatePath(`/companies/${company.slug}`);
  return { ok: true as const };
}

export async function respondToJobApplication(
  applicationId: string,
  status: Extract<JobApplicationStatus, "HIRED" | "DECLINED">
) {
  const { company } = await requireOwnedCompany();

  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      jobPosting: { companyId: company.id },
    },
    include: { jobPosting: true },
  });
  if (!application) return { error: "Application not found." as const };

  await prisma.$transaction(async (tx) => {
    await tx.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    if (status === "HIRED") {
      await tx.jobPosting.update({
        where: { id: application.jobPostingId },
        data: { status: "IN_PROGRESS" },
      });
      await tx.jobApplication.updateMany({
        where: {
          jobPostingId: application.jobPostingId,
          id: { not: applicationId },
          status: "PENDING",
        },
        data: { status: "DECLINED" },
      });
    }
  });

  revalidatePath("/portal/company");
  return { ok: true as const };
}

const adSchema = z.object({
  title: z.string().min(1).max(200),
  imageUrl: z.string().min(1).max(2048),
  targetUrl: z.string().min(1).max(2048),
  budgetThb: z.coerce.number().positive().max(10_000_000),
  dailyLimitThb: z.string().max(40),
});

export async function createAdCampaign(_prev: unknown, formData: FormData) {
  const { company } = await requireOwnedCompany();

  const parsed = adSchema.safeParse({
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl"),
    targetUrl: formData.get("targetUrl"),
    budgetThb: formData.get("budgetThb"),
    dailyLimitThb: String(formData.get("dailyLimitThb") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const imageUrl = normalizeHttpsUrl(parsed.data.imageUrl);
  const targetUrl = normalizeHttpsUrl(parsed.data.targetUrl);
  if (!imageUrl) return { error: "Invalid banner image URL." };
  if (!targetUrl) return { error: "Invalid target URL." };

  let dailyLimit: number | null = null;
  if (parsed.data.dailyLimitThb.trim()) {
    const n = Number(parsed.data.dailyLimitThb);
    if (!Number.isFinite(n) || n <= 0) return { error: "Invalid daily limit." };
    dailyLimit = thbToSatang(n);
  }

  await prisma.adCampaign.create({
    data: {
      companyId: company.id,
      title: parsed.data.title.trim(),
      imageUrl,
      targetUrl,
      budget: thbToSatang(parsed.data.budgetThb),
      dailyLimit,
      status: "PENDING",
    },
  });

  revalidatePath("/portal/company");
  return { ok: true as const };
}

export async function updateAdCampaignStatus(
  campaignId: string,
  status: Extract<AdCampaignStatus, "ACTIVE" | "PAUSED">
) {
  const { company } = await requireOwnedCompany();

  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, companyId: company.id },
  });
  if (!campaign) return { error: "Campaign not found." as const };

  await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status },
  });

  revalidatePath("/portal/company");
  return { ok: true as const };
}

export async function getOwnedCompanyOrNull() {
  const session = await requireCompany();
  return getCompanyByUserId(session.user.id);
}
