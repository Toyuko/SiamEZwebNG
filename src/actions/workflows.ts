"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireStaff } from "@/lib/auth";
import type { WorkflowStepKind } from "@prisma/client";
import * as workflowsDA from "@/data-access/workflows";
import { parseStepTarget, type WorkflowStepTarget } from "@/lib/workflows";

function revalidateWorkflowPaths() {
  revalidatePath("/admin/workflows");
  revalidatePath("/admin/workflows/approvals");
  revalidatePath("/portal/workflows");
}

// ----- Admin template CRUD -----

export async function adminListWorkflowTemplates() {
  await requireStaff();
  return workflowsDA.listTemplatesAdmin();
}

export async function adminGetWorkflowTemplate(id: string) {
  await requireStaff();
  return workflowsDA.getTemplateById(id);
}

export async function adminCreateWorkflowTemplate(formData: FormData) {
  await requireStaff();
  const key = String(formData.get("key") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  if (!key || !titleEn) throw new Error("Key and English title are required");

  const template = await workflowsDA.createTemplate({
    key,
    titleEn,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    active: formData.get("active") === "1" || formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  });
  revalidateWorkflowPaths();
  return template;
}

export async function adminUpdateWorkflowTemplate(id: string, formData: FormData) {
  await requireStaff();
  const template = await workflowsDA.updateTemplate(id, {
    key: String(formData.get("key") ?? "").trim() || undefined,
    titleEn: String(formData.get("titleEn") ?? "").trim() || undefined,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    active: formData.get("active") === "1" || formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  });
  revalidateWorkflowPaths();
  return template;
}

export async function adminDeleteWorkflowTemplate(id: string) {
  await requireStaff();
  await workflowsDA.deleteTemplate(id);
  revalidateWorkflowPaths();
}

function parseKind(raw: string): WorkflowStepKind {
  if (raw === "info" || raw === "action" || raw === "booking" || raw === "approval") {
    return raw;
  }
  return "action";
}

function targetFromForm(formData: FormData): WorkflowStepTarget {
  const rawJson = String(formData.get("targetJson") ?? "").trim();
  if (rawJson) {
    try {
      return parseStepTarget(JSON.parse(rawJson));
    } catch {
      throw new Error("Invalid target JSON");
    }
  }
  const serviceSlug = String(formData.get("serviceSlug") ?? "").trim() || undefined;
  const listingTypeRaw = String(formData.get("listingType") ?? "").trim();
  const listingType =
    listingTypeRaw === "vehicle" || listingTypeRaw === "property"
      ? listingTypeRaw
      : undefined;
  const listingId = String(formData.get("listingId") ?? "").trim() || undefined;
  const href = String(formData.get("href") ?? "").trim() || undefined;
  const category = String(formData.get("filterCategory") ?? "").trim() || undefined;
  const filterListingType =
    String(formData.get("filterListingType") ?? "").trim() || undefined;
  const province = String(formData.get("filterProvince") ?? "").trim() || undefined;

  return parseStepTarget({
    serviceSlug,
    listingType,
    listingId,
    href,
    listingFilters: {
      category,
      listingType: filterListingType,
      province,
    },
  });
}

export async function adminCreateWorkflowStep(templateId: string, formData: FormData) {
  await requireStaff();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  if (!titleEn) throw new Error("English title is required");

  const step = await workflowsDA.createTemplateStep(templateId, {
    key: String(formData.get("key") ?? "").trim() || null,
    titleEn,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    kind: parseKind(String(formData.get("kind") ?? "action")),
    requiresApproval:
      formData.get("requiresApproval") === "1" ||
      formData.get("requiresApproval") === "on",
    target: targetFromForm(formData),
  });
  revalidateWorkflowPaths();
  return step;
}

export async function adminUpdateWorkflowStep(stepId: string, formData: FormData) {
  await requireStaff();
  const step = await workflowsDA.updateTemplateStep(stepId, {
    key: String(formData.get("key") ?? "").trim() || null,
    titleEn: String(formData.get("titleEn") ?? "").trim() || undefined,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    kind: parseKind(String(formData.get("kind") ?? "action")),
    requiresApproval:
      formData.get("requiresApproval") === "1" ||
      formData.get("requiresApproval") === "on",
    target: targetFromForm(formData),
  });
  revalidateWorkflowPaths();
  return step;
}

export async function adminDeleteWorkflowStep(stepId: string) {
  await requireStaff();
  await workflowsDA.deleteTemplateStep(stepId);
  revalidateWorkflowPaths();
}

export async function adminListPendingApprovals() {
  await requireStaff();
  return workflowsDA.listPendingApprovals();
}

export async function staffApproveWorkflowStep(stepRunId: string) {
  const session = await requireStaff();
  await workflowsDA.staffApproveStep(stepRunId, session.user.id);
  revalidateWorkflowPaths();
}

export async function staffRejectWorkflowStep(stepRunId: string, formData: FormData) {
  const session = await requireStaff();
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  await workflowsDA.staffRejectStep(stepRunId, session.user.id, reason);
  revalidateWorkflowPaths();
}

// ----- Customer portal -----

export async function startMyWorkflow(templateId: string) {
  const session = await requireAuth();
  const run = await workflowsDA.startWorkflowRun(session.user.id, templateId);
  revalidateWorkflowPaths();
  return run;
}

export async function advanceMyWorkflowStep(stepRunId: string) {
  const session = await requireAuth();
  await workflowsDA.advanceStepRun(stepRunId, session.user.id);
  revalidateWorkflowPaths();
}

export async function linkMyWorkflowCase(runId: string, caseId: string) {
  const session = await requireAuth();
  await workflowsDA.linkCaseToRun(runId, session.user.id, caseId);
  revalidateWorkflowPaths();
}

export async function cancelMyWorkflow(runId: string) {
  const session = await requireAuth();
  await workflowsDA.cancelRun(runId, session.user.id);
  revalidateWorkflowPaths();
}
