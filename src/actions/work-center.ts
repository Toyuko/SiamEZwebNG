"use server";

import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { getWorkCenterSnapshot, listWorkCenter } from "@/data-access/work-center";

async function ensureStaffAccess() {
  if (isAdminAuthBypassEnabled()) return;
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Unauthorized");
  }
}

export async function listWorkCenterAction(filters: {
  tab?: string;
  search?: string;
  staffId?: string;
  serviceId?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "all";
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  await ensureStaffAccess();
  return listWorkCenter(filters);
}

export async function getWorkCenterSnapshotAction() {
  await ensureStaffAccess();
  return getWorkCenterSnapshot();
}
