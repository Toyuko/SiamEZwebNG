import { describe, expect, it } from "vitest";
import { statusForOutcome } from "@/lib/licence-verification/assess";
import { quotationGateDecision } from "@/lib/licence-verification/gate";
import {
  assessmentAllowsInvoice,
  buildUploadCustomerMessage,
  channelPlan,
  checklistForRequest,
  mergeChecklist,
  planFollowUp,
  serviceKindFromSelection,
  uploadLinkDecision,
} from "@/lib/licence-verification/upload-link";

const passport = "ZZ998877";

describe("driving licence upload links", () => {
  it("blocks an expired link and a revoked link", () => {
    const now = new Date("2026-11-12T10:00:00.000Z");
    const expired = uploadLinkDecision({
      status: "ACTIVE",
      expiresAt: "2026-11-12T09:00:00.000Z",
      now,
    });
    expect(expired.acceptUploads).toBe(false);
    expect(expired.reason).toBe("expired");

    const revoked = uploadLinkDecision({
      status: "REVOKED",
      expiresAt: "2026-12-01T00:00:00.000Z",
      now,
    });
    expect(revoked.acceptUploads).toBe(false);
    expect(revoked.reason).toBe("revoked");

    const open = uploadLinkDecision({
      status: "SUBMITTED",
      expiresAt: "2026-12-01T00:00:00.000Z",
      now,
    });
    expect(open.acceptUploads).toBe(true);
  });

  it("adds a follow-up checklist on the same application", () => {
    const first = checklistForRequest("CONVERSION_CAR");
    expect(first).toEqual(expect.arrayContaining([
      "passport",
      "visa_or_entry",
      "residence_certificate",
      "foreign_licence_front",
      "foreign_licence_back",
    ]));
    const followUp = planFollowUp({
      applicationId: "app-1",
      existingChecklist: first,
      extraDocuments: ["work_permit", "passport"],
    });
    expect(followUp.createsNewApplication).toBe(false);
    expect(followUp.applicationId).toBe("app-1");
    expect(followUp.checklist.filter((item) => item === "passport")).toHaveLength(1);
    expect(followUp.checklist).toContain("work_permit");
    expect(mergeChecklist(first, ["medical_certificate"])).toContain("medical_certificate");
  });

  it("builds a new-licence checklist without a second pricing catalogue", () => {
    expect(serviceKindFromSelection("new", "motorcycle")).toBe("NEW_MOTORCYCLE");
    expect(serviceKindFromSelection("conversion", "both")).toBe("CONVERSION_BOTH");
    expect(serviceKindFromSelection("idp", "car")).toBe("IDP");
    const medical = checklistForRequest("NEW_CAR");
    expect(medical).toContain("medical_certificate");
    expect(medical).not.toContain("foreign_licence_front");
    expect(checklistForRequest("RENEWAL")).toContain("previous_thai_licence");
  });

  it("keeps passport numbers out of the customer chat message", () => {
    const text = buildUploadCustomerMessage({
      link: "https://example.test/en/licence-upload/abc123token",
      note: `Please send passport ${passport} today`,
      passportNumber: passport,
    });
    expect(text).toContain("https://example.test/en/licence-upload/abc123token");
    expect(text).toContain("Thank you for contacting SiamEZ!");
    expect(text).not.toContain(passport);
    expect(text.toLowerCase()).not.toContain("zz998877");
  });

  it("still blocks a quotation before staff approval, including after an AI pass", () => {
    expect(assessmentAllowsInvoice("PASS")).toBe(false);
    expect(assessmentAllowsInvoice("ACTION_REQUIRED")).toBe(false);
    expect(assessmentAllowsInvoice("MANUAL_REVIEW")).toBe(false);
    expect(quotationGateDecision({
      status: statusForOutcome("PASS"),
      referenceNumber: "DLV-1",
    }).allowed).toBe(false);
    expect(quotationGateDecision({
      status: "APPROVED_FOR_QUOTATION",
      referenceNumber: "DLV-1",
    }).allowed).toBe(true);
  });

  it("can post into the sales chat and email, and only copies LINE or WhatsApp", () => {
    const plan = channelPlan({ email: "pat.example@example.test", canPostChat: true });
    expect(plan.chat).toBe("post");
    expect(plan.email).toBe("send");
    expect(plan.line).toBe("copy_only");
    expect(plan.whatsapp).toBe("copy_only");
    expect(plan.copy).toBe("available");
    expect(channelPlan({ email: "pending@upload.siamez.invalid", canPostChat: false }).email).toBe("copy_only");
  });
});
