import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";

const createJobSchema = z.object({
  assignmentSource: z.enum(["INTERNAL", "FREELANCER"]),
  userId: z.string().min(1),
  serviceId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().int().nonnegative(),
  payoutAmount: z.number().int().nonnegative().optional(),
  isSpecialMemberOnly: z.boolean().optional(),
  enableAutoApproval: z.boolean().optional(),
  status: z.string().optional(),
  staffIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
      return fail("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
    }

    const data = parsed.data;

    if (data.assignmentSource === "INTERNAL") {
      const { createServiceJob } = await import("@/actions/admin");
      const serviceId = data.serviceId;
      if (!serviceId) {
        return fail("Service is required for internal jobs.", 400);
      }
      const caseRecord = await createServiceJob({
        userId: data.userId,
        serviceId,
        amount: data.amount,
        status: (data.status as "new") ?? "new",
        staffIds: data.staffIds,
      });
      return ok({ type: "internal", id: caseRecord.id, caseNumber: caseRecord.caseNumber });
    }

    const title =
      data.title?.trim() ||
      (data.serviceId
        ? (
            await prisma.service.findUnique({
              where: { id: data.serviceId },
              select: { name: true },
            })
          )?.name
        : null) ||
      "Freelancer job";

    const description = data.description?.trim() || title;
    const payoutAmount = data.payoutAmount ?? data.amount;

    const job = await prisma.job.create({
      data: {
        title,
        description,
        postedById: data.userId,
        serviceId: data.serviceId ?? null,
        assignmentSource: "freelancer",
        amount: data.amount,
        payoutAmount,
        isSpecialMemberOnly: data.isSpecialMemberOnly ?? false,
        enableAutoApproval: data.enableAutoApproval ?? true,
        status: "open",
      },
      include: {
        postedBy: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    return ok({ type: "freelancer", job });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create job", 500);
  }
}
