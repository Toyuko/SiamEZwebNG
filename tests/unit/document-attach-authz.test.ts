import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/documents/authz", () => ({
  assertCanAttachDocumentToCase: vi.fn(),
}));

vi.mock("@/lib/domain/documents", () => ({
  createDocumentMetadata: vi.fn(),
  uploadAndCreateDocument: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { assertCanAttachDocumentToCase } from "@/lib/documents/authz";
import { createDocumentMetadata } from "@/lib/domain/documents";
import { uploadDocumentMetadataAction } from "@/actions/document";

const mockedRequireAuth = vi.mocked(requireAuth);
const mockedAssert = vi.mocked(assertCanAttachDocumentToCase);
const mockedCreateMeta = vi.mocked(createDocumentMetadata);

describe("uploadDocumentMetadataAction authz", () => {
  beforeEach(() => {
    mockedRequireAuth.mockReset();
    mockedAssert.mockReset();
    mockedCreateMeta.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects customers attaching to another user's case", async () => {
    mockedRequireAuth.mockResolvedValue({
      user: { id: "cust_1", role: "customer", email: "c@x.com", name: "C" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    mockedAssert.mockRejectedValue(new Error("Forbidden"));

    const result = await uploadDocumentMetadataAction({
      caseId: "case_1",
      name: "passport.pdf",
      storageKey: "mock://docs/passport.pdf",
    });

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(mockedCreateMeta).not.toHaveBeenCalled();
  });

  it("allows staff when ownership assert passes", async () => {
    mockedRequireAuth.mockResolvedValue({
      user: { id: "staff_1", role: "staff", email: "s@x.com", name: "S" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    mockedAssert.mockResolvedValue(undefined);
    mockedCreateMeta.mockResolvedValue({ id: "doc_1" } as never);

    const result = await uploadDocumentMetadataAction({
      caseId: "case_1",
      name: "passport.pdf",
      storageKey: "mock://docs/passport.pdf",
    });

    expect(result).toEqual({ success: true, documentId: "doc_1" });
    expect(mockedAssert).toHaveBeenCalledWith("case_1", "staff_1", "staff");
    expect(mockedCreateMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_1",
        uploadedBy: "staff_1",
      })
    );
  });
});
