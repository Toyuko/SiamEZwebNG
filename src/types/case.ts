/**
 * Case management types: status transitions, filters, and display.
 */

import type { CaseStatus } from "@prisma/client";

export type CaseStatusFilter = CaseStatus | "all";

export interface CaseStatusTransition {
  from: CaseStatus;
  to: CaseStatus;
  label: string;
  allowedRoles: ("admin" | "staff" | "customer")[];
}

export interface CaseListView {
  id: string;
  caseNumber: string;
  serviceName: string;
  status: CaseStatus;
  clientName: string;
  clientEmail: string;
  createdAt: Date;
  assignedStaff?: string[];
}

export interface CaseDetailView extends CaseListView {
  formData: Record<string, unknown> | null;
  quotes: { id: string; amount: number; currency: string; status: string }[];
  payments: { id: string; amount: number; status: string; type: string }[];
  documents: { id: string; name: string; documentType: string | null }[];
  notes: { id: string; content: string; isInternal: boolean; createdAt: Date }[];
}
