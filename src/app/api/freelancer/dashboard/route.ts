import { NextRequest } from "next/server";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import {
  getOpenJobsForFeed,
  getActiveJobsByFreelancerId,
  getFreelancerRevenueStats,
} from "@/data-access/job";
import { getFreelancerProfileByUserId } from "@/data-access/freelancer";
import { serializeFreelancerJob } from "@/lib/jobs/serialize";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const [openJobs, activeJobs, revenue, profile] = await Promise.all([
      getOpenJobsForFeed(userId),
      getActiveJobsByFreelancerId(userId),
      getFreelancerRevenueStats(userId),
      getFreelancerProfileByUserId(userId),
    ]);

    return ok({
      profile: profile
        ? {
            verificationStatus: profile.verificationStatus,
            averageRating: profile.averageRating,
            skills: profile.skills,
            bio: profile.bio,
            slug: profile.slug,
            isPublic: profile.isPublic,
            title: profile.title,
            hourlyRate: profile.hourlyRate,
          }
        : null,
      revenue: {
        totalEarned: revenue.totalEarned,
        pendingClearance: revenue.pendingClearance,
        currency: "THB",
      },
      openJobs: openJobs.map(serializeFreelancerJob),
      activeJobs: activeJobs.map(serializeFreelancerJob),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load freelancer dashboard";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
