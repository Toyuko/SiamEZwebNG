"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFreelancer } from "@/lib/auth";
import { prisma } from "@/lib/db";

const applySchema = z.object({
  jobPostingId: z.string().min(1),
  coverNote: z.string().max(2000).optional(),
});

export async function applyToJobPosting(input: {
  jobPostingId: string;
  coverNote?: string;
}) {
  const session = await requireFreelancer();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid application." as const };
  }

  const posting = await prisma.jobPosting.findUnique({
    where: { id: parsed.data.jobPostingId },
    include: { company: { select: { slug: true } } },
  });

  if (!posting || posting.status !== "OPEN") {
    return { error: "This job is no longer open." as const };
  }

  const existing = await prisma.jobApplication.findUnique({
    where: {
      jobPostingId_freelancerId: {
        jobPostingId: posting.id,
        freelancerId: session.user.id,
      },
    },
  });
  if (existing) {
    return { error: "already_applied" as const };
  }

  await prisma.jobApplication.create({
    data: {
      jobPostingId: posting.id,
      freelancerId: session.user.id,
      coverNote: parsed.data.coverNote?.trim() || null,
      status: "PENDING",
    },
  });

  revalidatePath("/portal/company");
  revalidatePath(`/companies/${posting.company.slug}`);
  return { ok: true as const };
}
