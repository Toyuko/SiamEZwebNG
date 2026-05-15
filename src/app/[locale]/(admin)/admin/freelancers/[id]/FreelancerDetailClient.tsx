"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateFreelancerVerification, approveFreelancerJob } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJobAmount } from "@/data-access/job";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { FreelancerVerificationStatus, JobStatus } from "@prisma/client";

type FreelancerDetail = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  freelancerProfile: {
    bio: string | null;
    skills: string[];
    verificationStatus: FreelancerVerificationStatus;
    averageRating: number;
  } | null;
  jobsAsFreelancer: {
    id: string;
    title: string;
    status: JobStatus;
    amount: number;
    currency: string;
    completionSubmittedAt: Date | null;
    postedBy: { id: string; name: string | null; email: string };
  }[];
};

const jobStatusStyles: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
};

export function FreelancerDetailClient({ freelancer }: { freelancer: FreelancerDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const profile = freelancer.freelancerProfile;
  const vStatus = profile?.verificationStatus ?? "pending";

  function setVerification(status: FreelancerVerificationStatus) {
    startTransition(async () => {
      await updateFreelancerVerification(freelancer.id, status);
      router.refresh();
    });
  }

  function handleApproveJob(jobId: string) {
    startTransition(async () => {
      await approveFreelancerJob(jobId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{freelancer.name ?? freelancer.email}</CardTitle>
          <p className="text-sm text-gray-500">{freelancer.email}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {freelancer.phone && <p className="text-sm">Phone: {freelancer.phone}</p>}
          {profile?.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{profile.bio}</p>
          )}
          {profile && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-siam-blue/10 px-2 py-1 text-xs text-siam-blue"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <span className="text-sm font-medium">Verification:</span>
            <span className="text-sm capitalize">{vStatus}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || vStatus === "verified"}
              onClick={() => setVerification("verified")}
            >
              Verify
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || vStatus === "rejected"}
              onClick={() => setVerification("rejected")}
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending || vStatus === "pending"}
              onClick={() => setVerification("pending")}
            >
              Reset to pending
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned jobs ({freelancer.jobsAsFreelancer.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {freelancer.jobsAsFreelancer.length === 0 ? (
            <p className="text-sm text-gray-500">No jobs assigned yet.</p>
          ) : (
            <ul className="space-y-3">
              {freelancer.jobsAsFreelancer.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div>
                    <Link
                      href={`/portal/jobs/${job.id}`}
                      className="font-medium text-siam-blue hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      Client: {job.postedBy.name ?? job.postedBy.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatJobAmount(job.amount, job.currency)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        jobStatusStyles[job.status]
                      )}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                    {job.status === "completed" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={pending}
                        onClick={() => handleApproveJob(job.id)}
                      >
                        Approve now
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
