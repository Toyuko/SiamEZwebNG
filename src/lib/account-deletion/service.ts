import { createHash } from "crypto";
import type {
  AccountDeletionRequestSource,
  Prisma,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ACCOUNT_DELETION_GENERIC_ACK,
  getAccountDeletionProcessingDays,
} from "@/config/account-deletion";
import {
  sendAccountDeletionCompletedEmail,
  sendAccountDeletionRequestReceivedEmail,
  sendAccountDeletionOpsAlert,
} from "@/lib/email/messages";

const STAFF_ROLES: UserRole[] = ["admin", "staff"];

export function normalizeDeletionEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidDeletionEmail(email: string): boolean {
  // Practical RFC5322-lite — server-side only.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(`siamez-deletion:${ip}`).digest("hex").slice(0, 32);
}

async function writeAudit(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    requestId?: string | null;
    userId?: string | null;
    actorId?: string | null;
    action: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await tx.accountDeletionAuditLog.create({
    data: {
      requestId: input.requestId ?? null,
      userId: input.userId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      metadata: input.metadata,
    },
  });
}

/**
 * Anonymize / unlink retained operational & financial records, then delete the User.
 * Financial invoices/payments/transactions are retained with user FKs set null.
 * Jobs posted by the user and reviews involving the user are removed (Restrict FKs).
 */
export async function executeAccountDeletion(
  userId: string,
  options?: {
    requestId?: string;
    actorId?: string | null;
    allowStaffRoles?: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, name: true },
  });

  if (!user) {
    return { ok: false, error: "User not found." };
  }

  if (STAFF_ROLES.includes(user.role) && !options?.allowStaffRoles) {
    return {
      ok: false,
      error: "Staff and admin accounts cannot be deleted through this flow. Contact support.",
    };
  }

  const email = normalizeDeletionEmail(user.email);
  const anonymizedLabel = "Deleted User";

  try {
    await prisma.$transaction(async (tx) => {
      // --- Retain cases; scrub PII and unlink ---
      await tx.case.updateMany({
        where: { userId },
        data: {
          userId: null,
          guestName: anonymizedLabel,
          guestEmail: null,
          guestPhone: null,
          formData: {},
          isGuest: true,
        },
      });

      // Guest bookings that used the same email (no userId link)
      await tx.case.updateMany({
        where: { guestEmail: { equals: email, mode: "insensitive" } },
        data: {
          guestName: anonymizedLabel,
          guestEmail: null,
          guestPhone: null,
          formData: {},
        },
      });

      // Listing enquiries
      await tx.listingEnquiry.updateMany({
        where: {
          OR: [
            { userId },
            { email: { equals: email, mode: "insensitive" } },
          ],
        },
        data: {
          userId: null,
          name: anonymizedLabel,
          email: `deleted+${userId.slice(0, 8)}@anonymized.invalid`,
          phone: null,
          message: "[redacted — account deleted]",
        },
      });

      // Vehicle leads with matching customer email
      await tx.vehicleLead.updateMany({
        where: { customerEmail: { equals: email, mode: "insensitive" } },
        data: {
          customerName: anonymizedLabel,
          customerEmail: null,
          customerPhone: null,
          customerLineId: null,
          notes: null,
        },
      });

      // Clear Restrict blockers before User delete
      await tx.review.deleteMany({
        where: {
          OR: [{ clientId: userId }, { freelancerId: userId }],
        },
      });

      await tx.job.deleteMany({
        where: { postedById: userId },
      });

      // Unlink assignee-style SetNull fields that might still reference user as required elsewhere — handled by schema.

      if (options?.requestId) {
        await tx.accountDeletionRequest.update({
          where: { id: options.requestId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            processingAt: new Date(),
            processedById: options.actorId ?? null,
            userId: null,
          },
        });
      }

      await writeAudit(tx, {
        requestId: options?.requestId,
        userId,
        actorId: options?.actorId,
        action: "ACCOUNT_DELETED",
        metadata: {
          role: user.role,
          retained: ["invoices", "payments", "financial_transactions", "cases_anonymized"],
          removed: ["user", "oauth_accounts", "sessions", "profile", "reviews", "posted_jobs"],
        },
      });

      await tx.user.delete({ where: { id: userId } });
    });
  } catch (e) {
    console.error("[account-deletion] execute failed:", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: "Deletion could not be completed. Please try again or contact support." };
  }

  void sendAccountDeletionCompletedEmail({
    to: email,
    processingDays: getAccountDeletionProcessingDays(),
  });

  return { ok: true };
}

export type SubmitDeletionRequestInput = {
  email: string;
  confirmed: boolean;
  locale?: string;
  ip?: string;
  source?: AccountDeletionRequestSource;
  /** When authenticated, bind to this user and optionally delete immediately. */
  authenticatedUserId?: string;
  deleteImmediately?: boolean;
  actorId?: string | null;
};

/**
 * Create a deletion request. Always returns a generic acknowledgement (no enumeration).
 * When deleteImmediately + authenticatedUserId, runs hard delete in the same flow.
 */
export async function submitAccountDeletionRequest(
  input: SubmitDeletionRequestInput
): Promise<{ ok: true; message: string; requestId?: string } | { ok: false; error: string }> {
  if (!input.confirmed) {
    return { ok: false, error: "Please confirm that you understand account deletion is permanent." };
  }

  const email = normalizeDeletionEmail(input.email);
  if (!isValidDeletionEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const source = input.source ?? "PUBLIC";
  const ipHash = input.ip ? hashClientIp(input.ip) : null;

  // Authenticated path: email must match session user
  if (input.authenticatedUserId) {
    const sessionUser = await prisma.user.findUnique({
      where: { id: input.authenticatedUserId },
      select: { id: true, email: true, role: true, active: true },
    });
    if (!sessionUser || !sessionUser.active) {
      return { ok: false, error: "Not signed in." };
    }
    if (normalizeDeletionEmail(sessionUser.email) !== email) {
      return { ok: false, error: "Email does not match your account." };
    }
    if (STAFF_ROLES.includes(sessionUser.role) && !input.deleteImmediately) {
      // Still accept as request for admin review rather than fail loudly on public? Authenticated staff should contact ops.
      return {
        ok: false,
        error: "Staff and admin accounts cannot be self-deleted. Contact support.",
      };
    }
  }

  const existingOpen = await prisma.accountDeletionRequest.findFirst({
    where: {
      email,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    select: { id: true },
  });

  if (existingOpen && !input.deleteImmediately) {
    // Duplicate — still generic ack, optional re-send email
    void sendAccountDeletionRequestReceivedEmail({
      to: email,
      processingDays: getAccountDeletionProcessingDays(),
      locale: input.locale,
    });
    return { ok: true, message: ACCOUNT_DELETION_GENERIC_ACK, requestId: existingOpen.id };
  }

  const matchedUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, active: true },
  });

  // If authenticated immediate delete
  if (input.deleteImmediately && input.authenticatedUserId) {
    const request = await prisma.accountDeletionRequest.create({
      data: {
        email,
        userId: input.authenticatedUserId,
        status: "PROCESSING",
        source: "AUTHENTICATED",
        locale: input.locale ?? null,
        ipHash,
        processingAt: new Date(),
      },
    });

    await writeAudit(prisma, {
      requestId: request.id,
      userId: input.authenticatedUserId,
      actorId: input.authenticatedUserId,
      action: "AUTHENTICATED_DELETE_STARTED",
    });

    const result = await executeAccountDeletion(input.authenticatedUserId, {
      requestId: request.id,
      actorId: input.authenticatedUserId,
    });

    if (!result.ok) {
      await prisma.accountDeletionRequest.update({
        where: { id: request.id },
        data: { status: "PENDING", adminNotes: result.error },
      });
      return { ok: false, error: result.error };
    }

    return { ok: true, message: ACCOUNT_DELETION_GENERIC_ACK, requestId: request.id };
  }

  const request = await prisma.accountDeletionRequest.create({
    data: {
      email,
      userId: matchedUser?.id ?? null,
      status: "PENDING",
      source,
      locale: input.locale ?? null,
      ipHash,
    },
  });

  await writeAudit(prisma, {
    requestId: request.id,
    userId: matchedUser?.id ?? null,
    actorId: input.actorId ?? null,
    action: "REQUEST_CREATED",
    metadata: {
      source,
      // Do not log whether user matched in a way exposed to client; audit may note presence for admins.
      userMatched: Boolean(matchedUser),
    },
  });

  void sendAccountDeletionRequestReceivedEmail({
    to: email,
    processingDays: getAccountDeletionProcessingDays(),
    locale: input.locale,
  });

  if (matchedUser) {
    void sendAccountDeletionOpsAlert({
      requestId: request.id,
      email,
      source,
      processingDays: getAccountDeletionProcessingDays(),
    });
  }

  return { ok: true, message: ACCOUNT_DELETION_GENERIC_ACK, requestId: request.id };
}

export async function adminProcessDeletionRequest(
  requestId: string,
  actorId: string,
  action: "process" | "reject",
  notes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const request = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { ok: false, error: "Request not found." };
  }

  if (request.status === "COMPLETED" || request.status === "REJECTED") {
    return { ok: false, error: "Request is already closed." };
  }

  if (action === "reject") {
    await prisma.$transaction(async (tx) => {
      await tx.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          processedById: actorId,
          adminNotes: notes?.trim() || request.adminNotes,
        },
      });
      await writeAudit(tx, {
        requestId,
        userId: request.userId,
        actorId,
        action: "REQUEST_REJECTED",
        metadata: notes ? { hasNotes: true } : undefined,
      });
    });
    return { ok: true };
  }

  // process
  let userId = request.userId;
  if (!userId) {
    const user = await prisma.user.findUnique({
      where: { email: request.email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) {
    await prisma.$transaction(async (tx) => {
      await tx.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          processingAt: new Date(),
          processedById: actorId,
          adminNotes:
            notes?.trim() ||
            request.adminNotes ||
            "No matching account found at processing time; request closed.",
        },
      });
      await writeAudit(tx, {
        requestId,
        actorId,
        action: "REQUEST_COMPLETED_NO_USER",
      });
    });
    return { ok: true };
  }

  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: "PROCESSING",
      processingAt: new Date(),
      processedById: actorId,
      adminNotes: notes?.trim() || request.adminNotes,
      userId,
    },
  });

  await writeAudit(prisma, {
    requestId,
    userId,
    actorId,
    action: "PROCESSING_STARTED",
  });

  const result = await executeAccountDeletion(userId, {
    requestId,
    actorId,
    allowStaffRoles: false,
  });

  if (!result.ok) {
    await prisma.accountDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "PENDING",
        adminNotes: [request.adminNotes, result.error].filter(Boolean).join("\n"),
      },
    });
    await writeAudit(prisma, {
      requestId,
      userId,
      actorId,
      action: "PROCESSING_FAILED",
      metadata: { reason: "execution_error" },
    });
    return result;
  }

  return { ok: true };
}
