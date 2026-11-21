import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";

export type AdminSearchGroup = {
  id: "cases" | "clients" | "invoices" | "companies";
  label: string;
  items: { id: string; title: string; subtitle?: string; href: string }[];
};

async function ensureStaffSearchAccess() {
  if (isAdminAuthBypassEnabled()) return;
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Unauthorized");
  }
}

export async function searchAdmin(query: string): Promise<AdminSearchGroup[]> {
  await ensureStaffSearchAccess();
  const q = query.trim();
  if (q.length < 2) return [];

  const [cases, clients, invoices, companies] = await Promise.all([
    prisma.case.findMany({
      where: {
        OR: [
          { caseNumber: { contains: q, mode: "insensitive" } },
          { guestName: { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
        guestName: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: "customer",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { case: { caseNumber: { contains: q, mode: "insensitive" } } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        case: { select: { caseNumber: true } },
      },
    }),
    prisma.company.findMany({
      where: {
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: { id: true, companyName: true, isVerified: true },
    }),
  ]);

  const groups: AdminSearchGroup[] = [];

  if (cases.length) {
    groups.push({
      id: "cases",
      label: "Cases",
      items: cases.map((c) => ({
        id: c.id,
        title: c.caseNumber,
        subtitle: `${c.service?.name ?? "Service"} · ${c.user?.name ?? c.guestName ?? c.user?.email ?? "Guest"}`,
        href: `/admin/cases/${c.id}`,
      })),
    });
  }

  if (clients.length) {
    groups.push({
      id: "clients",
      label: "Clients",
      items: clients.map((c) => ({
        id: c.id,
        title: c.name ?? c.email,
        subtitle: c.email,
        href: `/admin/clients/${c.id}`,
      })),
    });
  }

  if (invoices.length) {
    groups.push({
      id: "invoices",
      label: "Invoices",
      items: invoices.map((inv) => ({
        id: inv.id,
        title: inv.invoiceNumber ?? inv.id.slice(0, 8),
        subtitle: `${inv.case.caseNumber} · ${inv.status}`,
        href: `/admin/invoices/${inv.id}`,
      })),
    });
  }

  if (companies.length) {
    groups.push({
      id: "companies",
      label: "Companies",
      items: companies.map((co) => ({
        id: co.id,
        title: co.companyName,
        subtitle: co.isVerified ? "Verified" : "Pending verification",
        href: `/admin/companies/${co.id}`,
      })),
    });
  }

  return groups;
}
