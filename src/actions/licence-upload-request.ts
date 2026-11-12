"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { requireBackofficeActor } from "@/lib/backoffice/auth";
import {
  UploadLinkError,
  approveUploadQuotation,
  createUploadRequest,
  deliverUploadRequest,
  grantUploadLinkCookieToken,
  loadLicenceChatPanel,
  revokeUploadRequest,
  rerunUploadAssessment,
  saveUploadLinkDetails,
  searchUploadCustomers,
  submitUploadLink,
} from "@/lib/licence-verification/upload-request";
import { isLicenceDocumentType, isLicenceServiceKind } from "@/lib/licence-verification/types";

function failed(error: unknown) {
  if (error instanceof UploadLinkError) return { ok: false as const, error: error.message };
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const safe = /prisma|undefined|invocation|ECONN|timeout/i.test(message)
    ? "We could not save that just now. Please try again in a moment."
    : message;
  console.error("[licence-upload-link]", error);
  return { ok: false as const, error: safe };
}

async function viewer() {
  const session = await getSession();
  if (!session) return null;
  return { id: session.user.id, role: session.user.role };
}

export async function createLicenceUploadRequestAction(raw: {
  conversationId?: string | null;
  applicationId?: string | null;
  userId?: string | null;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  serviceKind?: string;
  vehicle?: "car" | "motorcycle" | "both" | null;
  message?: string | null;
  expiresAt?: string | null;
  extraDocuments?: string[];
  locale?: string | null;
}) {
  try {
    const actor = await requireBackofficeActor();
    if (!raw.serviceKind || !isLicenceServiceKind(raw.serviceKind)) {
      return { ok: false as const, error: "Choose a driving licence service." };
    }
    const created = await createUploadRequest(actor, {
      ...raw,
      serviceKind: raw.serviceKind,
      extraDocuments: (raw.extraDocuments ?? []).filter((item) => isLicenceDocumentType(item)),
    });
    return { ok: true as const, ...created };
  } catch (error) {
    return failed(error);
  }
}

export async function deliverLicenceUploadRequestAction(input: {
  requestId: string;
  message: string;
  chat: boolean;
  email: boolean;
}) {
  try {
    const actor = await requireBackofficeActor();
    const sent = await deliverUploadRequest(actor, input);
    return { ok: true as const, ...sent };
  } catch (error) {
    return failed(error);
  }
}

export async function loadLicenceChatPanelAction(conversationId: string | null) {
  try {
    const actor = await requireBackofficeActor();
    const panel = await loadLicenceChatPanel(actor, conversationId);
    return { ok: true as const, ...panel };
  } catch (error) {
    return failed(error);
  }
}

export async function searchLicenceCustomersAction(query: string) {
  try {
    await requireBackofficeActor();
    const customers = await searchUploadCustomers(query);
    return { ok: true as const, customers };
  } catch (error) {
    return failed(error);
  }
}

export async function revokeLicenceUploadRequestAction(requestId: string) {
  try {
    const actor = await requireBackofficeActor();
    await revokeUploadRequest(actor, requestId);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function approveUploadQuotationAction(requestId: string, overrideReason?: string) {
  try {
    const actor = await requireBackofficeActor();
    await approveUploadQuotation(actor, requestId, overrideReason);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function rerunUploadAssessmentAction(requestId: string) {
  try {
    const actor = await requireBackofficeActor();
    const result = await rerunUploadAssessment(actor, requestId);
    return { ok: true as const, ...result };
  } catch (error) {
    return failed(error);
  }
}

export async function rememberUploadLinkAction(token: string) {
  try {
    const accessToken = await grantUploadLinkCookieToken(token, await viewer());
    if (!accessToken) return;
    const jar = await cookies();
    jar.set("siamez_licence_access", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  } catch (error) {
    console.error("[licence-upload-link] cookie", error);
  }
}

export async function saveLicenceUploadDetailsAction(token: string, raw: unknown, locale: string) {
  try {
    const saved = await saveUploadLinkDetails(token, await viewer(), raw, locale);
    return saved;
  } catch (error) {
    return failed(error);
  }
}

export async function submitLicenceUploadAction(token: string) {
  try {
    return await submitUploadLink(token, await viewer());
  } catch (error) {
    return failed(error);
  }
}
