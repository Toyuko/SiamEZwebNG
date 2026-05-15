import type { JobStatus } from "@prisma/client";

type JobWithRelations = {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: JobStatus;
  completionSubmittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  postedBy: { id: string; name: string | null; email: string };
  freelancer?: { id: string; name: string | null; email: string } | null;
};

export function serializeFreelancerJob(job: JobWithRelations) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    amount: job.amount,
    currency: job.currency,
    status: job.status,
    completionSubmittedAt: job.completionSubmittedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    postedBy: {
      id: job.postedBy.id,
      name: job.postedBy.name,
      email: job.postedBy.email,
    },
    freelancer: job.freelancer
      ? {
          id: job.freelancer.id,
          name: job.freelancer.name,
          email: job.freelancer.email,
        }
      : null,
  };
}
