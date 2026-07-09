import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";

export async function getCompanyByUserId(userId: string) {
  return prisma.company.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
}

export async function ensureCompany(userId: string, companyName?: string) {
  const existing = await prisma.company.findUnique({ where: { userId } });
  if (existing) return existing;

  const name = companyName?.trim() || "My Company";
  let slug = toSlug(name) || "company";
  let attempt = 0;
  while (await prisma.company.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${toSlug(name) || "company"}-${attempt}`;
  }

  return prisma.company.create({
    data: {
      userId,
      companyName: name,
      slug,
    },
  });
}

export async function getCompanyDashboardByUserId(userId: string) {
  const company = await ensureCompany(userId);
  return prisma.company.findUnique({
    where: { id: company.id },
    include: {
      jobPostings: {
        orderBy: { createdAt: "desc" },
        include: {
          applications: {
            orderBy: { createdAt: "desc" },
            include: {
              freelancer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  freelancerProfile: {
                    select: {
                      averageRating: true,
                      totalReviews: true,
                      verificationStatus: true,
                      skills: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      adCampaigns: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getPublicCompanyProfileBySlug(slug: string) {
  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      jobPostings: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          jobPostings: { where: { status: "COMPLETED" } },
        },
      },
    },
  });
  return company;
}

export async function getCompanyStats(companyId: string) {
  const [activeJobs, budgetAgg, adAgg] = await Promise.all([
    prisma.jobPosting.count({
      where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.jobPosting.aggregate({
      where: { companyId },
      _sum: { budget: true },
    }),
    prisma.adCampaign.aggregate({
      where: { companyId },
      _sum: { impressions: true, clicks: true },
    }),
  ]);

  const impressions = adAgg._sum.impressions ?? 0;
  const clicks = adAgg._sum.clicks ?? 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return {
    activeJobs,
    totalSpent: budgetAgg._sum.budget ?? 0,
    impressions,
    clicks,
    ctr,
  };
}

export async function getRandomActiveAdCampaign() {
  const campaigns = await prisma.adCampaign.findMany({
    where: { status: "ACTIVE" },
    include: {
      company: {
        select: { companyName: true, slug: true, isVerified: true },
      },
    },
    take: 50,
  });
  if (campaigns.length === 0) return null;
  return campaigns[Math.floor(Math.random() * campaigns.length)] ?? null;
}
