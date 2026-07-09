import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseFreelancerServices,
  type FreelancerProfileUpdateInput,
  type FreelancerServiceOffering,
} from "@/lib/freelancer-profile";

const publicUserSelect = {
  id: true,
  name: true,
  image: true,
} as const;

const ownerUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
} as const;

export type PublicFreelancerCard = {
  id: string;
  slug: string;
  title: string | null;
  bio: string | null;
  skills: string[];
  hourlyRate: number | null;
  averageRating: number;
  totalReviews: number;
  verificationStatus: string;
  isSpecialMember: boolean;
  user: { id: string; name: string | null; image: string | null };
};

export type PublicFreelancerDetail = PublicFreelancerCard & {
  services: FreelancerServiceOffering[];
  createdAt: Date;
};

export async function getFreelancerProfileByUserId(userId: string) {
  return prisma.freelancerProfile.findUnique({
    where: { userId },
    include: { user: { select: ownerUserSelect } },
  });
}

export async function ensureFreelancerProfile(userId: string) {
  return prisma.freelancerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getPublicFreelancerBySlug(slug: string): Promise<PublicFreelancerDetail | null> {
  const profile = await prisma.freelancerProfile.findFirst({
    where: { slug, isPublic: true },
    include: { user: { select: publicUserSelect } },
  });
  if (!profile || !profile.slug) return null;
  return {
    id: profile.id,
    slug: profile.slug,
    title: profile.title,
    bio: profile.bio,
    skills: profile.skills,
    hourlyRate: profile.hourlyRate,
    averageRating: profile.averageRating,
    totalReviews: profile.totalReviews,
    verificationStatus: profile.verificationStatus,
    isSpecialMember: profile.isSpecialMember,
    services: parseFreelancerServices(profile.services),
    createdAt: profile.createdAt,
    user: profile.user,
  };
}

export async function listPublicFreelancers(options: {
  q?: string;
  skill?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PublicFreelancerCard[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, options.pageSize ?? 12));
  const q = options.q?.trim();
  const skill = options.skill?.trim();

  const where: Prisma.FreelancerProfileWhereInput = {
    isPublic: true,
    slug: { not: null },
  };

  const and: Prisma.FreelancerProfileWhereInput[] = [];

  if (skill) {
    and.push({ skills: { has: skill } });
  }

  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
        { skills: { hasSome: [q] } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (and.length) where.AND = and;

  const [total, rows] = await Promise.all([
    prisma.freelancerProfile.count({ where }),
    prisma.freelancerProfile.findMany({
      where,
      include: { user: { select: publicUserSelect } },
      orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: PublicFreelancerCard[] = rows
    .filter((p) => p.slug)
    .map((p) => ({
      id: p.id,
      slug: p.slug as string,
      title: p.title,
      bio: p.bio,
      skills: p.skills,
      hourlyRate: p.hourlyRate,
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      verificationStatus: p.verificationStatus,
      isSpecialMember: p.isSpecialMember,
      user: p.user,
    }));

  return { items, total, page, pageSize };
}

export async function isFreelancerSlugAvailable(slug: string, excludeUserId?: string) {
  const existing = await prisma.freelancerProfile.findUnique({
    where: { slug },
    select: { userId: true },
  });
  if (!existing) return true;
  return excludeUserId ? existing.userId === excludeUserId : false;
}

export async function upsertFreelancerPublicProfile(
  userId: string,
  data: FreelancerProfileUpdateInput
) {
  const servicesJson = data.services.map((s) => ({
    title: s.title.trim(),
    description: s.description?.trim() || undefined,
    price: s.price ?? null,
    currency: s.currency?.trim() || "THB",
  }));

  const skills = Array.from(
    new Set(data.skills.map((s) => s.trim()).filter(Boolean))
  ).slice(0, 30);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });
    if (!user?.active) throw new Error("Unauthorized");

    // Opting into a public freelancer listing promotes customers to the freelancer role.
    if (user.role === "customer") {
      await tx.user.update({
        where: { id: userId },
        data: { role: "freelancer" },
      });
    }

    return tx.freelancerProfile.upsert({
      where: { userId },
      create: {
        userId,
        slug: data.slug,
        isPublic: data.isPublic,
        title: data.title?.trim() || null,
        bio: data.bio?.trim() || null,
        skills,
        hourlyRate: data.hourlyRate ?? null,
        services: servicesJson,
      },
      update: {
        slug: data.slug,
        isPublic: data.isPublic,
        title: data.title?.trim() || null,
        bio: data.bio?.trim() || null,
        skills,
        hourlyRate: data.hourlyRate ?? null,
        services: servicesJson,
      },
      include: { user: { select: ownerUserSelect } },
    });
  });
}

export function serializeOwnerProfile(
  profile: NonNullable<Awaited<ReturnType<typeof getFreelancerProfileByUserId>>>
) {
  return {
    id: profile.id,
    userId: profile.userId,
    slug: profile.slug,
    isPublic: profile.isPublic,
    title: profile.title,
    bio: profile.bio,
    skills: profile.skills,
    hourlyRate: profile.hourlyRate,
    services: parseFreelancerServices(profile.services),
    verificationStatus: profile.verificationStatus,
    isSpecialMember: profile.isSpecialMember,
    averageRating: profile.averageRating,
    totalReviews: profile.totalReviews,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: profile.user,
  };
}
