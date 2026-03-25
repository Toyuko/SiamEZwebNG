"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { nextCaseNumber } from "@/lib/utils";
import { createCase } from "@/data-access/case";
import { put } from "@vercel/blob";
import * as invoiceDA from "@/data-access/invoice";

export interface InvoiceWizardLineItem {
  description: string;
  quantity: number;
  unitAmountSatang: number;
  lineTotalSatang: number;
}

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().int().min(1).max(9999),
  unitAmountSatang: z.coerce.number().int().min(0),
});

const wizardSchema = z
  .object({
    mode: z.enum(["existing_case", "new_case"]),
    caseId: z.string().optional(),
    serviceId: z.string().optional(),
    clientType: z.enum(["registered", "guest"]).optional(),
    userId: z.string().optional().nullable(),
    guestName: z.string().optional(),
    guestEmail: z.string().optional(),
    guestPhone: z.string().optional(),
    clientAddress: z.string().max(2000).optional(),
    lineItems: z.array(lineItemSchema).min(1),
    dueDate: z.string().nullable().optional(),
    currency: z.string().optional(),
    initialStatus: z.enum(["draft", "unpaid"]),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "existing_case") {
      if (!val.caseId?.trim()) {
        ctx.addIssue({ code: "custom", message: "Select a case", path: ["caseId"] });
      }
    }
    if (val.mode === "new_case") {
      if (!val.serviceId?.trim()) {
        ctx.addIssue({ code: "custom", message: "Select a service", path: ["serviceId"] });
      }
      if (val.clientType === "registered" && !val.userId?.trim()) {
        ctx.addIssue({ code: "custom", message: "Select a client", path: ["userId"] });
      }
      if (
        val.clientType === "guest" &&
        (!val.guestName?.trim() || !val.guestEmail?.trim())
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Guest name and email are required",
          path: ["guestEmail"],
        });
      }
    }
  });

export async function searchCasesForInvoiceWizard(query: string) {
  try {
    await requireStaff();
    const q = query.trim();
    if (!q) return [];

    return prisma.case.findMany({
      where: {
        OR: [
          { caseNumber: { contains: q } },
          { guestEmail: { contains: q } },
          { guestName: { contains: q } },
          { user: { email: { contains: q } } },
          { user: { name: { contains: q } } },
        ],
      },
      take: 15,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        caseNumber: true,
        guestName: true,
        guestEmail: true,
        user: { select: { name: true, email: true } },
      },
    });
  } catch {
    return [];
  }
}

export async function searchClientsForInvoiceWizard(query: string) {
  try {
    await requireStaff();
    const q = query.trim();
    if (!q) return [];

    return prisma.user.findMany({
      where: {
        role: "customer",
        OR: [{ email: { contains: q } }, { name: { contains: q } }],
      },
      take: 15,
      select: { id: true, name: true, email: true },
    });
  } catch {
    return [];
  }
}

export async function createInvoiceViaWizard(raw: unknown) {
  try {
    await requireStaff();
    const parsed = wizardSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Invalid input";
      return { success: false as const, error: msg };
    }
    const input = parsed.data;

    const currency = input.currency?.trim() || "THB";
    const clientAddress = input.clientAddress?.trim() || null;
    const linePayload: InvoiceWizardLineItem[] = input.lineItems.map((row) => {
      const lineTotalSatang = row.quantity * row.unitAmountSatang;
      return {
        description: row.description.trim(),
        quantity: row.quantity,
        unitAmountSatang: row.unitAmountSatang,
        lineTotalSatang,
      };
    });
    const amount = linePayload.reduce((sum, r) => sum + r.lineTotalSatang, 0);
    if (amount <= 0) {
      return { success: false as const, error: "Invoice total must be greater than zero" };
    }

    const dueDate =
      input.dueDate && input.dueDate.trim() !== "" ? new Date(input.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return { success: false as const, error: "Invalid due date" };
    }

    let caseId: string;
    let userId: string | null;

    if (input.mode === "existing_case") {
      const c = await prisma.case.findUnique({
        where: { id: input.caseId! },
        select: { id: true, userId: true },
      });
      if (!c) {
        return { success: false as const, error: "Case not found" };
      }
      caseId = c.id;
      userId = c.userId;
    } else {
      const service = await prisma.service.findUnique({
        where: { id: input.serviceId! },
        select: { id: true },
      });
      if (!service) {
        return { success: false as const, error: "Service not found" };
      }

      if (input.clientType === "registered") {
        const u = await prisma.user.findFirst({
          where: { id: input.userId!, role: "customer" },
          select: { id: true },
        });
        if (!u) {
          return { success: false as const, error: "Client not found" };
        }
        userId = u.id;
        const newCase = await createCase({
          caseNumber: nextCaseNumber(),
          serviceId: input.serviceId!,
          userId,
          isGuest: false,
          status: "new",
        });
        caseId = newCase.id;
      } else {
        userId = null;
        const newCase = await createCase({
          caseNumber: nextCaseNumber(),
          serviceId: input.serviceId!,
          userId: null,
          isGuest: true,
          guestName: input.guestName!.trim(),
          guestEmail: input.guestEmail!.trim(),
          guestPhone: input.guestPhone?.trim() || null,
          status: "new",
        });
        caseId = newCase.id;
      }
    }

    const invoice = await invoiceDA.createInvoice({
      caseId,
      userId,
      amount,
      currency,
      status: "draft",
      dueDate,
      lineItems: linePayload,
      clientAddress,
    });

    if (input.initialStatus === "unpaid") {
      await invoiceDA.updateInvoiceStatus(invoice.id, "unpaid");
    }

    const updated = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    return { success: true as const, invoiceId: invoice.id, invoice: updated };
  } catch (e) {
    console.error("createInvoiceViaWizard error", e);
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Failed to create invoice",
    };
  }
}

export async function uploadInvoicePdfAction(formData: FormData) {
  try {
    await requireStaff();
    const invoiceId = String(formData.get("invoiceId") ?? "").trim();
    const file = formData.get("file");
    if (!invoiceId || !file || !(file instanceof File)) {
      return { success: false as const, error: "Invoice and file are required" };
    }
    if (file.type !== "application/pdf") {
      return { success: false as const, error: "Only PDF files are allowed" };
    }
    if (file.size > 15 * 1024 * 1024) {
      return { success: false as const, error: "File must be 15MB or smaller" };
    }

    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    if (!inv) {
      return { success: false as const, error: "Invoice not found" };
    }

    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const pathname = `invoices/${invoiceId}/${Date.now()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { attachedPdfUrl: blob.url },
    });

    return { success: true as const, url: blob.url };
  } catch (e) {
    console.error("uploadInvoicePdfAction error", e);
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export interface CreateInvoiceFromQuoteInput {
  caseId: string;
  quoteId: string;
  userId: string;
  amount: number;
  currency?: string;
  dueDate?: Date;
  lineItems?: object;
}

/**
 * Admin action: Create an invoice from an accepted quote.
 * Used for quote-based services.
 */
export async function createInvoiceFromQuote(input: CreateInvoiceFromQuoteInput) {
  try {
    const created = await invoiceDA.createInvoice({
      caseId: input.caseId,
      quoteId: input.quoteId,
      userId: input.userId,
      amount: input.amount,
      currency: input.currency ?? "THB",
      status: "draft",
      dueDate: input.dueDate ?? null,
      lineItems: input.lineItems ?? null,
    });
    const invoice = await invoiceDA.updateInvoiceStatus(created.id, "unpaid");
    return { success: true, invoice };
  } catch (e) {
    console.error("createInvoiceFromQuote error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create invoice",
    };
  }
}
