import { prisma } from "@/lib/db";

export async function getFreelancerProfileByUserId(userId: string) {
  return prisma.freelancerProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

export async function ensureFreelancerProfile(userId: string) {
  return prisma.freelancerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
