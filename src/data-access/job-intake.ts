import { Prisma, type CaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";
import { assertEligibleSalesperson, planAttributionChange } from "@/lib/finance/sales";
import { assertCaseStatusTransition } from "@/lib/domain/case-status";
import {
  JOB_INTAKE_DEPOSIT_SOURCE,
  JOB_INTAKE_EVENT_MARKER,
  CustomerChoiceRequiredError,
  JobIntakeValidationError,
  bangkokDateInputValue,
  buildJobCopyText,
  caseServiceName,
  copyStaffName,
  decideCustomer,
  displayInvoiceNumber,
  formatSequentialInvoiceNumber,
  formatSequentialReceiptNumber,
  invoiceLineItems,
  invoiceStatusForDeposit,
  nextInvoiceSequence,
  nextReceiptSequence,
  shouldIssueReceipt,
  parseDocumentsRequired,
  paymentStanding,
  phoneDigits,
  phonesMatch,
  planCalendarEvent,
  scheduleWindowRange,
  staffDisplayName,
  validateJobIntake,
  type CustomerRecord,
  type JobIntakeInput,
  type ScheduleWindow,
  type ValidatedJobIntake,
} from "@/lib/jobs/intake";

const jobInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true } },
  salesPerson: { select: { id: true, name: true, email: true } },
  staffAssignments: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  invoices: {
    include: { payments: true },
    orderBy: { createdAt: "desc" as const },
  },
  events: { orderBy: { start: "asc" as const } },
} satisfies Prisma.CaseInclude;

type JobRow = Prisma.CaseGetPayload<{ include: typeof jobInclude }>;

export type JobIntakeView = ReturnType<typeof toJobView>;

function approvedPaid(row: JobRow): number {
  return row.invoices
    .flatMap((invoice) => invoice.payments)
    .filter((payment) => payment.status === "approved")
    .reduce((sum, payment) => sum + payment.amount, 0);
}

function toJobView(row: JobRow) {
  const invoice = row.invoices[0] ?? null;
  const totalSatang = invoice?.amount ?? row.dealValue ?? 0;
  const paidSatang = approvedPaid(row);
  const depositSatang =
    row.invoices
      .flatMap((item) => item.payments)
      .filter(
        (payment) =>
          payment.status === "approved" &&
          (payment.metadata as { source?: string } | null)?.source === JOB_INTAKE_DEPOSIT_SOURCE
      )
      .reduce((sum, payment) => sum + payment.amount, 0) || Math.min(paidSatang, invoice?.depositAmount ?? paidSatang);
  const outstanding = Math.max(0, totalSatang - paidSatang);
  const assigned = row.staffAssignments[0]?.user ?? null;
  const jobType = caseServiceName(row);
  const documents = parseDocumentsRequired(row.documentsRequired);
  const invoiceNumber = invoice ? displayInvoiceNumber(invoice) : "—";
  const receiptPayment =
    row.invoices
      .flatMap((item) => item.payments)
      .find((payment) => payment.status === "approved" && payment.receiptNumber) ?? null;
  const receiptNumber = receiptPayment?.receiptNumber ?? null;
  const copyText = buildJobCopyText({
    customerName: row.user?.name ?? row.guestName ?? "—",
    customerEmail: row.user?.email ?? row.guestEmail ?? "—",
    customerPhone: row.user?.phone ?? row.guestPhone,
    leadSource: row.leadSource,
    leadSourceDetail: row.leadSourceDetail,
    staffName: copyStaffName(assigned, row.salesPerson),
    scheduledAt: row.scheduledAt,
    timeTbd: row.scheduleTimeTbd,
    jobType,
    jobDescription: row.jobDescription,
    totalSatang,
    depositSatang,
    outstandingSatang: outstanding,
    location: row.location,
    documents,
    invoiceNumber,
    receiptNumber,
  });
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    status: row.status,
    customer: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          phone: row.user.phone,
        }
      : null,
    customerName: row.user?.name ?? row.guestName ?? "",
    customerEmail: row.user?.email ?? row.guestEmail ?? "",
    customerPhone: row.user?.phone ?? row.guestPhone ?? "",
    leadSource: row.leadSource,
    leadSourceDetail: row.leadSourceDetail,
    closedBy: row.salesPerson,
    assignedStaff: assigned,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    scheduleTimeTbd: row.scheduleTimeTbd,
    serviceId: row.serviceId,
    serviceName: row.service?.name ?? null,
    otherServiceName: row.otherServiceName,
    jobType,
    jobDescription: row.jobDescription,
    location: row.location,
    documents,
    totalSatang,
    depositSatang,
    paidSatang,
    outstandingSatang: outstanding,
    paymentStatus: paymentStanding(totalSatang, paidSatang),
    invoiceId: invoice?.id ?? null,
    invoiceNumber,
    invoiceStatus: invoice?.status ?? null,
    receiptNumber,
    copyText,
    events: row.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      allDay: event.allDay,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadJob(id: string): Promise<JobRow | null> {
  return prisma.case.findUnique({ where: { id }, include: jobInclude });
}

async function allocateInvoiceNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const year = Number(bangkokDateInputValue(now).slice(0, 4));
  const rows = await tx.invoice.findMany({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    select: { invoiceNumber: true },
  });
  const sequence = nextInvoiceSequence(
    rows.map((row) => row.invoiceNumber).filter((value): value is string => Boolean(value)),
    year
  );
  return formatSequentialInvoiceNumber(year, sequence);
}

async function allocateReceiptNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const year = Number(bangkokDateInputValue(now).slice(0, 4));
  const rows = await tx.payment.findMany({
    where: { receiptNumber: { startsWith: `RCP-${year}-` } },
    select: { receiptNumber: true },
  });
  const sequence = nextReceiptSequence(
    rows.map((row) => row.receiptNumber).filter((value): value is string => Boolean(value)),
    year
  );
  return formatSequentialReceiptNumber(year, sequence);
}

async function resolveCustomer(
  input: ValidatedJobIntake
): Promise<{ decision: ReturnType<typeof decideCustomer>; emailMatch: CustomerRecord | null }> {
  const emailMatch = await prisma.user.findUnique({
    where: { email: input.customerEmail },
    select: { id: true, name: true, email: true, phone: true },
  });
  let phoneMatches: CustomerRecord[] = [];
  if (!emailMatch && input.customerPhone) {
    const digits = phoneDigits(input.customerPhone).slice(-9);
    if (digits.length >= 9) {
      const rows = await prisma.user.findMany({
        where: { role: "customer", phone: { contains: digits } },
        select: { id: true, name: true, email: true, phone: true },
        take: 15,
      });
      phoneMatches = rows.filter((row) => phonesMatch(row.phone, input.customerPhone));
    }
  }
  const decision = decideCustomer({
    emailMatch,
    phoneMatches,
    choice: input.customerChoice,
    existingCustomerId: input.existingCustomerId,
  });
  return { decision, emailMatch };
}

async function assertReferences(input: ValidatedJobIntake) {
  const [closer, assignee, service] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.closedByStaffId },
      select: { id: true, name: true, email: true, role: true, active: true },
    }),
    input.assignedStaffId
      ? prisma.user.findUnique({
          where: { id: input.assignedStaffId },
          select: { id: true, name: true, email: true, role: true, active: true },
        })
      : Promise.resolve(null),
    input.serviceId
      ? prisma.service.findUnique({
          where: { id: input.serviceId },
          select: { id: true, name: true, active: true },
        })
      : Promise.resolve(null),
  ]);
  try {
    assertEligibleSalesperson(closer);
  } catch {
    throw new JobIntakeValidationError("Check the highlighted fields.", {
      closedByStaffId: "Choose an active staff member.",
    });
  }
  if (input.assignedStaffId) {
    if (!assignee || !assignee.active || (assignee.role !== "admin" && assignee.role !== "staff")) {
      throw new JobIntakeValidationError("Check the highlighted fields.", {
        assignedStaffId: "Choose an active staff member or TBD.",
      });
    }
  }
  if (input.serviceId) {
    if (!service || !service.active) {
      throw new JobIntakeValidationError("Check the highlighted fields.", {
        serviceId: "Choose an active service or Other.",
      });
    }
  }
  return { closer: closer!, assignee, service };
}

function caseData(input: ValidatedJobIntake, actorId: string | null, userId: string) {
  return {
    userId,
    serviceId: input.serviceId,
    otherServiceName: input.otherServiceName,
    guestName: input.customerName,
    guestEmail: input.customerEmail,
    guestPhone: input.customerPhone,
    leadSource: input.leadSource,
    leadSourceDetail: input.leadSourceDetail,
    scheduledAt: input.scheduledAt,
    scheduleTimeTbd: input.timeTbd,
    location: input.location,
    jobDescription: input.jobDescription,
    documentsRequired: input.documentsRequired,
    dealValue: input.totalSatang,
    salesPersonId: input.closedByStaffId,
    updatedById: actorId,
  };
}

async function syncSchedule(
  tx: Prisma.TransactionClient,
  input: {
    caseId: string;
    userId: string;
    staffId: string | null;
    customerName: string;
    jobType: string;
    staffName: string;
    location: string | null;
    status: string;
    scheduledAt: Date | null;
    timeTbd: boolean;
  }
) {
  const plan = planCalendarEvent(input);
  const events = await tx.event.findMany({ where: { caseId: input.caseId } });
  const existing = events.find((event) => event.description?.includes(JOB_INTAKE_EVENT_MARKER)) ?? null;
  if (plan.action === "none") {
    if (existing) await tx.event.delete({ where: { id: existing.id } });
    return;
  }
  const data = {
    title: plan.title,
    description: plan.description,
    start: plan.start,
    end: plan.end,
    allDay: plan.allDay,
    type: "appointment" as const,
    caseId: input.caseId,
    userId: input.userId,
    staffId: input.staffId,
    color: "blue",
  };
  if (existing) {
    await tx.event.update({ where: { id: existing.id }, data });
  } else {
    await tx.event.create({ data });
  }
}

async function syncDepositPayment(
  tx: Prisma.TransactionClient,
  input: {
    caseId: string;
    invoiceId: string;
    depositSatang: number;
    totalSatang: number;
    now: Date;
    issueReceipt: boolean;
  }
) {
  const payments = await tx.payment.findMany({ where: { invoiceId: input.invoiceId } });
  const intake = payments.find(
    (payment) => (payment.metadata as { source?: string } | null)?.source === JOB_INTAKE_DEPOSIT_SOURCE
  );
  if (input.depositSatang <= 0) {
    if (intake) await tx.payment.delete({ where: { id: intake.id } });
  } else if (intake) {
    const receiptNumber =
      intake.receiptNumber ??
      (input.issueReceipt ? await allocateReceiptNumber(tx, input.now) : null);
    await tx.payment.update({
      where: { id: intake.id },
      data: {
        amount: input.depositSatang,
        status: "approved",
        approvedAt: intake.approvedAt ?? input.now,
        kind: input.depositSatang >= input.totalSatang ? "full" : "initial",
        receiptNumber,
      },
    });
  } else {
    await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        caseId: input.caseId,
        amount: input.depositSatang,
        currency: "THB",
        method: "cash",
        status: "approved",
        approvedAt: input.now,
        kind: input.depositSatang >= input.totalSatang ? "full" : "initial",
        receiptNumber: input.issueReceipt ? await allocateReceiptNumber(tx, input.now) : null,
        metadata: { source: JOB_INTAKE_DEPOSIT_SOURCE },
      },
    });
  }
  const remaining = await tx.payment.findMany({
    where: { invoiceId: input.invoiceId, status: "approved" },
    select: { amount: true },
  });
  const paid = remaining.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid > input.totalSatang) {
    throw new JobIntakeValidationError("Check the highlighted fields.", {
      depositAmount: "Deposit and other payments cannot exceed the total price.",
    });
  }
  const fullyPaid = input.totalSatang > 0 && paid >= input.totalSatang;
  await tx.invoice.update({
    where: { id: input.invoiceId },
    data: {
      amount: input.totalSatang,
      depositAmount: input.depositSatang > 0 ? input.depositSatang : null,
      status: fullyPaid ? "paid" : "unpaid",
      paidAt: fullyPaid ? input.now : null,
      lineItems: invoiceLineItems(
        "Service",
        null,
        input.totalSatang
      ) as unknown as Prisma.InputJsonValue,
    },
  });
  return paid;
}

function isIdempotencyConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes("intake_idempotency")
  );
}

/** Session ids must exist on User. A stale local session falls back to the same email. */
async function resolveStaffActor(actor: { id: string; email: string }): Promise<string> {
  const byId = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, role: true, active: true },
  });
  if (byId && byId.active && (byId.role === "admin" || byId.role === "staff")) {
    return byId.id;
  }
  const email = actor.email.trim();
  if (email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, role: true, active: true },
    });
    if (byEmail && byEmail.active && (byEmail.role === "admin" || byEmail.role === "staff")) {
      return byEmail.id;
    }
  }
  throw new Error("Unauthorized");
}

export async function createConfirmedJob(
  actor: { id: string; email: string } | null,
  raw: JobIntakeInput
): Promise<JobIntakeView> {
  const actorId = actor ? await resolveStaffActor(actor) : null;
  const input = validateJobIntake(raw, { requireIdempotencyKey: true });
  if (!input.idempotencyKey) {
    throw new JobIntakeValidationError("Check the highlighted fields.", {
      idempotencyKey: "Missing a valid submission key. Refresh and try again.",
    });
  }
  const existing = await prisma.case.findUnique({
    where: { intakeIdempotencyKey: input.idempotencyKey },
    include: jobInclude,
  });
  if (existing) return toJobView(existing);

  const { decision } = await resolveCustomer(input);
  if (decision.action === "needs_choice") {
    throw new CustomerChoiceRequiredError(decision.candidates);
  }
  const refs = await assertReferences(input);
  const now = new Date();

  let caseId: string;
  try {
    caseId = await prisma.$transaction(async (tx) => {
      const raced = await tx.case.findUnique({
        where: { intakeIdempotencyKey: input.idempotencyKey! },
        select: { id: true },
      });
      if (raced) return raced.id;

      let userId: string;
      if (decision.action === "reuse") {
        userId = decision.userId;
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true, phone: true },
        });
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(current?.name?.trim() ? {} : { name: input.customerName }),
            ...(current?.phone?.trim() || !input.customerPhone ? {} : { phone: input.customerPhone }),
          },
        });
      } else {
        try {
          const createdUser = await tx.user.create({
            data: {
              email: input.customerEmail,
              name: input.customerName,
              phone: input.customerPhone,
              role: "customer",
            },
            select: { id: true },
          });
          userId = createdUser.id;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            const found = await tx.user.findUnique({
              where: { email: input.customerEmail },
              select: { id: true },
            });
            if (!found) throw error;
            userId = found.id;
          } else {
            throw error;
          }
        }
      }

      const invoiceNumber = await allocateInvoiceNumber(tx, now);
      const jobType = input.otherServiceName ?? refs.service?.name ?? "Service";
      const created = await tx.case.create({
        data: {
          caseNumber: nextCaseNumber(),
          status: "confirmed",
          isGuest: false,
          closedAt: now,
          createdById: actorId,
          intakeIdempotencyKey: input.idempotencyKey,
          ...caseData(input, actorId, userId),
        },
        select: { id: true },
      });
      await tx.salesAttributionAudit.create({
        data: {
          caseId: created.id,
          previousSalesPersonId: null,
          newSalesPersonId: input.closedByStaffId,
          changedById: actorId ?? input.closedByStaffId,
          reason: actorId ? "Confirmed job intake" : "Confirmed job from the staff link",
          createdAt: now,
        },
      });
      if (input.assignedStaffId) {
        await tx.staffAssignment.create({
          data: { caseId: created.id, userId: input.assignedStaffId, role: "primary" },
        });
      }
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          caseId: created.id,
          userId,
          amount: input.totalSatang,
          depositAmount: input.depositSatang > 0 ? input.depositSatang : null,
          currency: "THB",
          status: invoiceStatusForDeposit(input.totalSatang, input.depositSatang),
          kind: "full",
          lineItems: invoiceLineItems(jobType, input.jobDescription, input.totalSatang) as unknown as Prisma.InputJsonValue,
          clientAddress: input.location,
          sentAt: now,
          paidAt: input.depositSatang >= input.totalSatang && input.totalSatang > 0 ? now : null,
        },
      });
      if (input.depositSatang > 0) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            caseId: created.id,
            amount: input.depositSatang,
            currency: "THB",
            method: "cash",
            status: "approved",
            approvedAt: now,
            kind: input.depositSatang >= input.totalSatang ? "full" : "initial",
            receiptNumber: shouldIssueReceipt(input.createReceipt, input.depositSatang)
              ? await allocateReceiptNumber(tx, now)
              : null,
            metadata: { source: JOB_INTAKE_DEPOSIT_SOURCE },
          },
        });
      }
      await syncSchedule(tx, {
        caseId: created.id,
        userId,
        staffId: input.assignedStaffId ?? input.closedByStaffId,
        customerName: input.customerName,
        jobType,
        staffName: staffDisplayName(input.assignedStaffId ? refs.assignee : refs.closer),
        location: input.location,
        status: "confirmed",
        scheduledAt: input.scheduledAt,
        timeTbd: input.timeTbd,
      });
      await tx.caseNote.create({
        data: {
          caseId: created.id,
          userId: actorId ?? input.closedByStaffId,
          content: `Confirmed job created. Total ${input.totalSatang} satang, deposit ${input.depositSatang} satang.${
            shouldIssueReceipt(input.createReceipt, input.depositSatang) ? " Receipt issued for the amount received." : ""
          }`,
          isInternal: true,
        },
      });
      return created.id;
    });
  } catch (error) {
    if (isIdempotencyConflict(error)) {
      const raced = await prisma.case.findUnique({
        where: { intakeIdempotencyKey: input.idempotencyKey },
        include: jobInclude,
      });
      if (raced) return toJobView(raced);
    }
    throw error;
  }

  const saved = await loadJob(caseId);
  if (!saved) throw new Error("Job was created but could not be reloaded.");
  return toJobView(saved);
}

export async function updateConfirmedJob(
  actor: { id: string; email: string },
  caseId: string,
  raw: JobIntakeInput & { status?: CaseStatus }
): Promise<JobIntakeView> {
  const actorId = await resolveStaffActor(actor);
  const input = validateJobIntake(raw, { requireIdempotencyKey: false });
  const existing = await loadJob(caseId);
  if (!existing) throw new Error("Job not found");
  if (raw.status && raw.status !== existing.status) {
    assertCaseStatusTransition(existing.status, raw.status);
  }
  const refs = await assertReferences(input);
  const now = new Date();
  const nextStatus = raw.status ?? existing.status;

  if (input.customerEmail) {
    const emailOwner = await prisma.user.findUnique({
      where: { email: input.customerEmail },
      select: { id: true },
    });
    if (emailOwner && existing.userId && emailOwner.id !== existing.userId) {
      throw new JobIntakeValidationError("Check the highlighted fields.", {
        customerEmail: "That email already belongs to another customer.",
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    let userId = existing.userId;
    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: input.customerName,
          email: input.customerEmail,
          phone: input.customerPhone,
        },
      });
    } else {
      const createdUser = await tx.user.create({
        data: {
          email: input.customerEmail,
          name: input.customerName,
          phone: input.customerPhone,
          role: "customer",
        },
        select: { id: true },
      });
      userId = createdUser.id;
    }

    const change = planAttributionChange({
      previousSalesPersonId: existing.salesPersonId,
      newSalesPersonId: input.closedByStaffId,
      changedById: actorId,
      reason: "Updated from job intake",
      now,
    });

    await tx.case.update({
      where: { id: caseId },
      data: {
        ...caseData(input, actorId, userId!),
        status: nextStatus,
        closedAt: existing.closedAt ?? now,
      },
    });
    if (change) {
      await tx.salesAttributionAudit.create({
        data: {
          caseId,
          previousSalesPersonId: change.previousSalesPersonId,
          newSalesPersonId: change.newSalesPersonId,
          changedById: change.changedById,
          reason: change.reason,
          createdAt: change.at,
        },
      });
      if (existing.salesPersonId && existing.salesPersonId !== input.closedByStaffId) {
        const commission = await tx.salesCommission.findUnique({
          where: { caseId },
          select: { financialTransactionId: true },
        });
        await tx.salesCommission.updateMany({
          where: { caseId },
          data: { salesPersonId: input.closedByStaffId },
        });
        if (commission?.financialTransactionId) {
          await tx.financialTransaction.update({
            where: { id: commission.financialTransactionId },
            data: { staffId: input.closedByStaffId },
          });
        }
      }
    }

    await tx.staffAssignment.deleteMany({ where: { caseId } });
    if (input.assignedStaffId) {
      await tx.staffAssignment.create({
        data: { caseId, userId: input.assignedStaffId, role: "primary" },
      });
    }

    const jobType = input.otherServiceName ?? refs.service?.name ?? "Service";
    let invoice = existing.invoices[0] ?? null;
    if (!invoice) {
      invoice = await tx.invoice.create({
        data: {
          invoiceNumber: await allocateInvoiceNumber(tx, now),
          caseId,
          userId,
          amount: input.totalSatang,
          depositAmount: input.depositSatang > 0 ? input.depositSatang : null,
          currency: "THB",
          status: "unpaid",
          kind: "full",
          lineItems: invoiceLineItems(jobType, input.jobDescription, input.totalSatang) as unknown as Prisma.InputJsonValue,
          clientAddress: input.location,
          sentAt: now,
        },
        include: { payments: true },
      });
    } else {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          userId,
          amount: input.totalSatang,
          depositAmount: input.depositSatang > 0 ? input.depositSatang : null,
          lineItems: invoiceLineItems(jobType, input.jobDescription, input.totalSatang) as unknown as Prisma.InputJsonValue,
          clientAddress: input.location,
        },
      });
    }

    await syncDepositPayment(tx, {
      caseId,
      invoiceId: invoice.id,
      depositSatang: input.depositSatang,
      totalSatang: input.totalSatang,
      now,
      issueReceipt: shouldIssueReceipt(input.createReceipt, input.depositSatang),
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        lineItems: invoiceLineItems(jobType, input.jobDescription, input.totalSatang) as unknown as Prisma.InputJsonValue,
      },
    });

    await syncSchedule(tx, {
      caseId,
      userId: userId!,
      staffId: input.assignedStaffId ?? input.closedByStaffId,
      customerName: input.customerName,
      jobType,
      staffName: staffDisplayName(input.assignedStaffId ? refs.assignee : refs.closer),
      location: input.location,
      status: nextStatus,
      scheduledAt: input.scheduledAt,
      timeTbd: input.timeTbd,
    });

    const notes: string[] = [];
    if ((existing.dealValue ?? existing.invoices[0]?.amount) !== input.totalSatang) {
      notes.push(`Price changed to ${input.totalSatang} satang.`);
    }
    if ((existing.invoices[0]?.depositAmount ?? 0) !== (input.depositSatang > 0 ? input.depositSatang : 0)) {
      notes.push(`Deposit changed to ${input.depositSatang} satang.`);
    }
    if (existing.salesPersonId !== input.closedByStaffId) notes.push("Closed by changed.");
    const previousAssignee = existing.staffAssignments[0]?.userId ?? null;
    if (previousAssignee !== input.assignedStaffId) notes.push("Assigned staff changed.");
    if (raw.status && raw.status !== existing.status) notes.push(`Status changed to ${nextStatus}.`);
    if (notes.length > 0) {
      await tx.caseNote.create({
        data: {
          caseId,
          userId: actorId,
          content: notes.join(" "),
          isInternal: true,
        },
      });
    }
  });

  const saved = await loadJob(caseId);
  if (!saved) throw new Error("Job was updated but could not be reloaded.");
  return toJobView(saved);
}

export async function getConfirmedJob(id: string): Promise<JobIntakeView | null> {
  const row = await loadJob(id);
  return row ? toJobView(row) : null;
}

export async function regenerateJobInvoice(
  actor: { id: string; email: string },
  caseId: string
): Promise<JobIntakeView> {
  const actorId = await resolveStaffActor(actor);
  const existing = await loadJob(caseId);
  if (!existing) throw new Error("Job not found");
  const invoice = existing.invoices[0];
  const jobType = caseServiceName(existing);
  const total = invoice?.amount ?? existing.dealValue ?? 0;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (!invoice) {
      await tx.invoice.create({
        data: {
          invoiceNumber: await allocateInvoiceNumber(tx, now),
          caseId,
          userId: existing.userId,
          amount: total,
          currency: "THB",
          status: "unpaid",
          kind: "full",
          lineItems: invoiceLineItems(jobType, existing.jobDescription, total) as unknown as Prisma.InputJsonValue,
          clientAddress: existing.location,
          sentAt: now,
        },
      });
    } else {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          lineItems: invoiceLineItems(jobType, existing.jobDescription, total) as unknown as Prisma.InputJsonValue,
          clientAddress: existing.location,
          amount: total,
        },
      });
    }
    await tx.case.update({ where: { id: caseId }, data: { updatedById: actorId } });
    await tx.caseNote.create({
      data: {
        caseId,
        userId: actorId,
        content: "Invoice regenerated from the job record.",
        isInternal: true,
      },
    });
  });
  const saved = await loadJob(caseId);
  if (!saved) throw new Error("Job not found");
  return toJobView(saved);
}

export async function listPublicIntakeOptions() {
  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "staff"] }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    services,
    staff: staff.map((person) => ({ id: person.id, name: person.name, email: "" })),
  };
}

export async function lookupJobCustomer(email: string, phone?: string | null) {
  const normalized = email.trim().toLowerCase();
  const emailMatch = normalized
    ? await prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true, name: true, email: true, phone: true },
      })
    : null;
  let phoneMatches: CustomerRecord[] = [];
  if (!emailMatch && phone) {
    const digits = phoneDigits(phone).slice(-9);
    if (digits.length >= 9) {
      const rows = await prisma.user.findMany({
        where: { role: "customer", phone: { contains: digits } },
        select: { id: true, name: true, email: true, phone: true },
        take: 15,
      });
      phoneMatches = rows.filter((row) => phonesMatch(row.phone, phone));
    }
  }
  return { emailMatch, phoneMatches };
}

export async function listJobs(filters: {
  search?: string;
  window?: ScheduleWindow;
  staffId?: string;
  closedById?: string;
  serviceId?: string;
  status?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "all";
  source?: string;
  page?: number;
  now?: Date;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  const where: Prisma.CaseWhereInput = {};
  if (filters.status && filters.status !== "all") where.status = filters.status as CaseStatus;
  if (filters.closedById && filters.closedById !== "all") where.salesPersonId = filters.closedById;
  if (filters.staffId && filters.staffId !== "all") {
    where.staffAssignments = { some: { userId: filters.staffId } };
  }
  if (filters.serviceId && filters.serviceId !== "all") {
    if (filters.serviceId === "other") where.serviceId = null;
    else where.serviceId = filters.serviceId;
  }
  if (filters.source && filters.source !== "all") where.leadSource = filters.source;
  const range = scheduleWindowRange(filters.window ?? "all", filters.now ?? new Date());
  if (range) where.scheduledAt = { gte: range.start, lt: range.end };
  const q = filters.search?.trim();
  if (q) {
    where.OR = [
      { caseNumber: { contains: q, mode: "insensitive" } },
      { id: q },
      { guestName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q, mode: "insensitive" } },
      { otherServiceName: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
      { invoices: { some: { invoiceNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (filters.paymentStatus === "unpaid") {
    where.payments = { none: { status: "approved" } };
  }

  const needsPaymentScan = filters.paymentStatus === "partial" || filters.paymentStatus === "paid";
  const orderBy = [{ scheduledAt: "asc" as const }, { createdAt: "desc" as const }];
  const rows = needsPaymentScan
    ? await prisma.case.findMany({ where, include: jobInclude, orderBy, take: 400 })
    : await prisma.case.findMany({
        where,
        include: jobInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
  let views = rows.map(toJobView);
  if (needsPaymentScan) {
    views = views.filter((job) => job.paymentStatus === filters.paymentStatus);
  }
  const total = needsPaymentScan
    ? views.length
    : await prisma.case.count({ where });
  const paged = needsPaymentScan ? views.slice((page - 1) * pageSize, page * pageSize) : views;
  return {
    jobs: paged,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
