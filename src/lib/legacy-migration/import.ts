import { Prisma, type CaseStatus, type PrismaClient, type UserRole } from "@prisma/client";
import { MIGRATION_BOT_EMAIL, type TransformedBundle } from "./types";
import { parseLegacyDate } from "./normalize";

export type ImportResult = {
  dryRun: boolean;
  created: Record<string, number>;
  reused: Record<string, number>;
  mappings: {
    customers: Array<{ legacyCustomerId: number; newUserId: string }>;
    staff: Array<{ legacyStaffId: number; newUserId: string }>;
    jobs: Array<{ legacyJobId: number; newCaseId: string; caseNumber: string }>;
    invoices: Array<{ legacyOrderId: number; newInvoiceId: string }>;
    payments: Array<{ legacyOrderId: number; newPaymentId: string }>;
  };
};

const emptyCounts = () => ({
  customers: 0,
  staff: 0,
  services: 0,
  cases: 0,
  invoices: 0,
  payments: 0,
  events: 0,
  notes: 0,
  maps: 0,
});

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseDate(value: string | null | undefined, fallback = new Date()): Date {
  return parseLegacyDate(value) ?? fallback;
}

export function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url.replace(/^postgresql:/i, "http:"));
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function importTransformedBundle(
  prisma: PrismaClient,
  bundle: TransformedBundle,
  options: { dryRun: boolean }
): Promise<ImportResult> {
  const created = emptyCounts();
  const reused = emptyCounts();
  const mappings: ImportResult["mappings"] = {
    customers: [],
    staff: [],
    jobs: [],
    invoices: [],
    payments: [],
  };

  if (options.dryRun) {
    created.customers = bundle.customers.length;
    created.staff = bundle.staff.length;
    created.services = bundle.servicesToEnsure.length;
    created.cases = bundle.cases.length;
    created.invoices = bundle.invoices.length;
    created.payments = bundle.payments.length;
    created.events = bundle.events.length;
    created.notes = bundle.cases.filter((c) => c.internalNotes).length;
    mappings.customers = bundle.customers.map((c) => ({
      legacyCustomerId: c.legacyCustomerId,
      newUserId: `(dry-run customer ${c.legacyCustomerId})`,
    }));
    mappings.jobs = bundle.cases.map((c) => ({
      legacyJobId: c.legacyJobId,
      newCaseId: `(dry-run job ${c.legacyJobId})`,
      caseNumber: c.caseNumber,
    }));
    mappings.invoices = bundle.invoices.map((i) => ({
      legacyOrderId: i.legacyOrderId,
      newInvoiceId: `(dry-run invoice ${i.legacyOrderId})`,
    }));
    mappings.payments = bundle.payments.map((p) => ({
      legacyOrderId: p.legacyOrderId,
      newPaymentId: `(dry-run payment ${p.legacyOrderId})`,
    }));
    return { dryRun: true, created, reused, mappings };
  }

  const tx = prisma;
    const bot = await tx.user.upsert({
      where: { email: MIGRATION_BOT_EMAIL },
      update: { role: "staff", active: true, name: "Legacy migration" },
      create: {
        email: MIGRATION_BOT_EMAIL,
        name: "Legacy migration",
        role: "staff",
        active: true,
      },
    });

    const serviceBySlug = new Map<string, string>();
    const existingServices = await tx.service.findMany({ select: { id: true, slug: true } });
    for (const s of existingServices) serviceBySlug.set(s.slug, s.id);
    for (const svc of bundle.servicesToEnsure) {
      if (serviceBySlug.has(svc.slug)) {
        reused.services += 1;
        continue;
      }
      const createdSvc = await tx.service.create({
        data: {
          slug: svc.slug,
          name: svc.name,
          description: svc.name,
          type: "quote",
          active: svc.active,
        },
      });
      serviceBySlug.set(svc.slug, createdSvc.id);
      created.services += 1;
    }

    const staffIdByLegacy = new Map<number, string>();
    for (const s of bundle.staff) {
      const existing =
        (await tx.user.findFirst({ where: { legacyStaffId: s.legacyStaffId } })) ??
        (await tx.user.findUnique({ where: { email: s.email } }));
      if (existing) {
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            legacyStaffId: s.legacyStaffId,
            name: existing.name || s.name,
            phone: existing.phone || s.phone,
            role: existing.role === "admin" ? "admin" : (s.role as UserRole),
          },
        });
        staffIdByLegacy.set(s.legacyStaffId, updated.id);
        reused.staff += 1;
        await upsertMap(tx, "staff", String(s.legacyStaffId), updated.id);
      } else {
        const createdUser = await tx.user.create({
          data: {
            email: s.email,
            name: s.name,
            phone: s.phone,
            role: s.role,
            notes: s.notes,
            legacyStaffId: s.legacyStaffId,
            createdAt: parseDate(s.createdAt),
          },
        });
        staffIdByLegacy.set(s.legacyStaffId, createdUser.id);
        created.staff += 1;
        mappings.staff.push({ legacyStaffId: s.legacyStaffId, newUserId: createdUser.id });
        await upsertMap(tx, "staff", String(s.legacyStaffId), createdUser.id);
      }
    }

    const userIdByLegacyCustomer = new Map<number, string>();
    for (const c of bundle.customers) {
      const existing =
        (await tx.user.findFirst({ where: { legacyCustomerId: c.legacyCustomerId } })) ??
        (await tx.user.findUnique({ where: { email: c.email } }));
      if (existing) {
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            legacyCustomerId: c.legacyCustomerId,
            name: existing.name || c.name,
            phone: existing.phone || c.phone,
            address: existing.address || c.address,
            notes: existing.notes || c.notes,
            metadata: jsonValue(c.metadata),
          },
        });
        userIdByLegacyCustomer.set(c.legacyCustomerId, updated.id);
        reused.customers += 1;
        mappings.customers.push({ legacyCustomerId: c.legacyCustomerId, newUserId: updated.id });
        await upsertMap(tx, "customer", String(c.legacyCustomerId), updated.id);
      } else {
        const createdUser = await tx.user.create({
          data: {
            email: c.email,
            name: c.name,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
            role: "customer",
            legacyCustomerId: c.legacyCustomerId,
            metadata: jsonValue(c.metadata),
            createdAt: parseDate(c.createdAt),
          },
        });
        userIdByLegacyCustomer.set(c.legacyCustomerId, createdUser.id);
        created.customers += 1;
        mappings.customers.push({ legacyCustomerId: c.legacyCustomerId, newUserId: createdUser.id });
        await upsertMap(tx, "customer", String(c.legacyCustomerId), createdUser.id);
      }
    }

    const caseIdByJob = new Map<number, string>();
    for (const job of bundle.cases) {
      const serviceId = serviceBySlug.get(job.serviceSlug);
      if (!serviceId) {
        throw new Error(`Missing destination service slug ${job.serviceSlug} for job ${job.legacyJobId}`);
      }
      const userId = userIdByLegacyCustomer.get(job.legacyCustomerId) ?? null;
      const existing = await tx.case.findFirst({ where: { legacyJobId: job.legacyJobId } });
      const data = {
        caseNumber: job.caseNumber,
        userId,
        serviceId,
        status: job.status as CaseStatus,
        isGuest: false,
        formData: jsonValue(job.formData),
        legacyJobId: job.legacyJobId,
        legacyOrderNumber: job.legacyOrderNumber,
        createdAt: parseDate(job.createdAt),
        completedAt: parseLegacyDate(job.completedAt),
      };
      const saved = existing
        ? await tx.case.update({
            where: { id: existing.id },
            data: {
              ...data,
              caseNumber: existing.caseNumber,
            },
          })
        : await tx.case.create({ data });
      if (existing) reused.cases += 1;
      else created.cases += 1;
      caseIdByJob.set(job.legacyJobId, saved.id);
      mappings.jobs.push({
        legacyJobId: job.legacyJobId,
        newCaseId: saved.id,
        caseNumber: saved.caseNumber,
      });
      await upsertMap(tx, "job", String(job.legacyJobId), saved.id, {
        caseNumber: saved.caseNumber,
      });

      if (job.internalNotes) {
        const mapped = await tx.legacyIdMap.findUnique({
          where: { entityType_legacyId: { entityType: "job_note", legacyId: String(job.legacyJobId) } },
        });
        if (!mapped) {
          const note = await tx.caseNote.create({
            data: {
              caseId: saved.id,
              userId: bot.id,
              content: job.internalNotes,
              isInternal: true,
              createdAt: parseDate(job.createdAt),
            },
          });
          created.notes += 1;
          await upsertMap(tx, "job_note", String(job.legacyJobId), note.id);
        } else {
          reused.notes += 1;
        }
      }
    }

    const invoiceIdByOrder = new Map<number, string>();
    for (const inv of bundle.invoices) {
      const caseId = caseIdByJob.get(inv.legacyJobId);
      if (!caseId) continue;
      const existing = await tx.invoice.findFirst({ where: { legacyOrderId: inv.legacyOrderId } });
      const data = {
        caseId,
        userId: userIdByLegacyCustomer.get(inv.legacyCustomerId) ?? null,
        amount: inv.amountSatang,
        currency: "THB",
        status: inv.status,
        kind: "full" as const,
        paymentMethod: inv.paymentMethod,
        lineItems: jsonValue(inv.lineItems),
        clientAddress: inv.clientAddress,
        legacyOrderId: inv.legacyOrderId,
        createdAt: parseDate(inv.createdAt),
        paidAt: parseLegacyDate(inv.paidAt),
        sentAt: parseDate(inv.createdAt),
      };
      const saved = existing
        ? await tx.invoice.update({ where: { id: existing.id }, data })
        : await tx.invoice.create({ data });
      if (existing) reused.invoices += 1;
      else created.invoices += 1;
      invoiceIdByOrder.set(inv.legacyOrderId, saved.id);
      mappings.invoices.push({ legacyOrderId: inv.legacyOrderId, newInvoiceId: saved.id });
      await upsertMap(tx, "invoice", String(inv.legacyOrderId), saved.id);
    }

    for (const pay of bundle.payments) {
      const caseId = caseIdByJob.get(pay.legacyJobId);
      const invoiceId = invoiceIdByOrder.get(pay.legacyOrderId);
      if (!caseId || !invoiceId) continue;
      const existing =
        (await tx.payment.findFirst({ where: { legacyOrderId: pay.legacyOrderId } })) ??
        (await tx.payment.findUnique({ where: { idempotencyKey: pay.idempotencyKey } }));
      const data = {
        invoiceId,
        caseId,
        amount: pay.amountSatang,
        currency: "THB",
        method: pay.method,
        status: pay.status,
        kind: "full" as const,
        idempotencyKey: pay.idempotencyKey,
        legacyOrderId: pay.legacyOrderId,
        submittedAt: parseDate(pay.createdAt),
        approvedAt: parseLegacyDate(pay.approvedAt),
        createdAt: parseDate(pay.createdAt),
      };
      const saved = existing
        ? await tx.payment.update({ where: { id: existing.id }, data })
        : await tx.payment.create({ data });
      if (existing) reused.payments += 1;
      else created.payments += 1;
      mappings.payments.push({ legacyOrderId: pay.legacyOrderId, newPaymentId: saved.id });
      await upsertMap(tx, "payment", String(pay.legacyOrderId), saved.id);
    }

    for (const ev of bundle.events) {
      const caseId = caseIdByJob.get(ev.legacyJobId);
      if (!caseId) continue;
      const mapped = await tx.legacyIdMap.findUnique({
        where: { entityType_legacyId: { entityType: "event", legacyId: String(ev.legacyJobId) } },
      });
      if (mapped) {
        reused.events += 1;
        continue;
      }
      const job = bundle.cases.find((c) => c.legacyJobId === ev.legacyJobId);
      const createdEv = await tx.event.create({
        data: {
          title: ev.title,
          description: ev.description,
          start: parseDate(ev.start),
          end: parseDate(ev.end),
          type: "appointment",
          caseId,
          userId: job ? userIdByLegacyCustomer.get(job.legacyCustomerId) ?? null : null,
        },
      });
      created.events += 1;
      await upsertMap(tx, "event", String(ev.legacyJobId), createdEv.id);
    }

  return { dryRun: false, created, reused, mappings };
}

async function upsertMap(
  tx: PrismaClient,
  entityType: string,
  legacyId: string,
  newId: string,
  extra?: Record<string, unknown>
) {
  await tx.legacyIdMap.upsert({
    where: { entityType_legacyId: { entityType, legacyId } },
    update: { newId, extra: extra ? jsonValue(extra) : undefined },
    create: { entityType, legacyId, newId, extra: extra ? jsonValue(extra) : undefined },
  });
}
