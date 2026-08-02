"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireStaff } from "@/lib/auth";
import type { LifeEventRunStatus, LifeEventStepStatus } from "@prisma/client";
import * as lifeEventsDA from "@/data-access/life-events";
import { syncLinkedGoalsFromLifeEvent } from "@/data-access/goals";
import type { LifeEventStepTarget } from "@/lib/life-events";
import { parseStepTarget } from "@/lib/life-events";

function revalidateAdminAndPortal() {
  revalidatePath("/admin/life-events");
  revalidatePath("/portal/goals");
}

// ----- Admin CRUD -----

export async function adminListLifeEvents() {
  await requireStaff();
  return lifeEventsDA.listLifeEventsAdmin();
}

export async function adminGetLifeEvent(id: string) {
  await requireStaff();
  return lifeEventsDA.getLifeEventById(id);
}

export async function adminCreateLifeEvent(formData: FormData) {
  await requireStaff();
  const key = String(formData.get("key") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  if (!key || !titleEn) throw new Error("Key and English title are required");

  const event = await lifeEventsDA.createLifeEvent({
    key,
    titleEn,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    active: formData.get("active") === "1" || formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  });
  revalidateAdminAndPortal();
  return event;
}

export async function adminUpdateLifeEvent(id: string, formData: FormData) {
  await requireStaff();
  const event = await lifeEventsDA.updateLifeEvent(id, {
    key: String(formData.get("key") ?? "").trim() || undefined,
    titleEn: String(formData.get("titleEn") ?? "").trim() || undefined,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    active: formData.get("active") === "1" || formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  });
  revalidateAdminAndPortal();
  return event;
}

export async function adminDeleteLifeEvent(id: string) {
  await requireStaff();
  await lifeEventsDA.deleteLifeEvent(id);
  revalidateAdminAndPortal();
}

function targetFromForm(formData: FormData): LifeEventStepTarget {
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

export async function adminCreateLifeEventStep(lifeEventId: string, formData: FormData) {
  await requireStaff();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  if (!titleEn) throw new Error("English title is required");
  const step = await lifeEventsDA.createLifeEventStep(lifeEventId, {
    titleEn,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    target: targetFromForm(formData),
  });
  revalidateAdminAndPortal();
  return step;
}

export async function adminUpdateLifeEventStep(stepId: string, formData: FormData) {
  await requireStaff();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  if (!titleEn) throw new Error("English title is required");
  const step = await lifeEventsDA.updateLifeEventStep(stepId, {
    titleEn,
    titleTh: String(formData.get("titleTh") ?? "").trim() || null,
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionTh: String(formData.get("descriptionTh") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    target: targetFromForm(formData),
  });
  revalidateAdminAndPortal();
  return step;
}

export async function adminDeleteLifeEventStep(stepId: string) {
  await requireStaff();
  await lifeEventsDA.deleteLifeEventStep(stepId);
  revalidateAdminAndPortal();
}

// ----- Customer -----

export async function listActiveLifeEventsForCustomer() {
  await requireAuth();
  return lifeEventsDA.listActiveLifeEvents();
}

export async function startLifeEvent(lifeEventId: string) {
  const session = await requireAuth();
  const progress = await lifeEventsDA.startLifeEventForUser(
    session.user.id,
    lifeEventId
  );
  await syncLinkedGoalsFromLifeEvent(session.user.id, lifeEventId);
  revalidatePath("/portal/goals");
  return progress;
}

export async function listMyLifeEventProgress() {
  const session = await requireAuth();
  return lifeEventsDA.listUserLifeEventProgress(session.user.id);
}

export async function updateMyStepStatus(
  progressId: string,
  stepId: string,
  status: LifeEventStepStatus
) {
  const session = await requireAuth();
  const result = await lifeEventsDA.transitionStepProgress(
    session.user.id,
    progressId,
    stepId,
    status
  );
  if (result) {
    await syncLinkedGoalsFromLifeEvent(session.user.id, result.lifeEventId);
  }
  revalidatePath("/portal/goals");
  return result;
}

export async function updateMyRunStatus(
  progressId: string,
  status: LifeEventRunStatus
) {
  const session = await requireAuth();
  const result = await lifeEventsDA.setRunStatus(
    session.user.id,
    progressId,
    status
  );
  if (result) {
    await syncLinkedGoalsFromLifeEvent(session.user.id, result.lifeEventId);
  }
  revalidatePath("/portal/goals");
  return result;
}
