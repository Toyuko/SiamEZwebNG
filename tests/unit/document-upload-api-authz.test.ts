import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth/getApiUser", () => ({
  getApiUser: vi.fn(),
}));

vi.mock("@/lib/documents/authz", () => ({
  assertCanAttachDocumentToCase: vi.fn(),
}));

vi.mock("@/lib/domain/documents", () => ({
  uploadAndCreateDocument: vi.fn(),
}));

import { getApiUser } from "@/lib/auth/getApiUser";
import { assertCanAttachDocumentToCase } from "@/lib/documents/authz";
import { uploadAndCreateDocument } from "@/lib/domain/documents";
import { POST } from "@/app/api/documents/upload/route";

const mockedGetApiUser = vi.mocked(getApiUser);
const mockedAssert = vi.mocked(assertCanAttachDocumentToCase);
const mockedUpload = vi.mocked(uploadAndCreateDocument);

function formRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return {
    formData: async () => formData,
  } as NextRequest;
}

describe("POST /api/documents/upload ownership", () => {
  beforeEach(() => {
    mockedGetApiUser.mockReset();
    mockedAssert.mockReset();
    mockedUpload.mockReset();
  });

  it("asserts case ownership before upload when caseId is set", async () => {
    mockedGetApiUser.mockResolvedValue({ userId: "cust_1", role: "customer" });
    mockedAssert.mockRejectedValue(new Error("Forbidden"));

    const file = new File([new Uint8Array([1, 2, 3])], "passport.pdf", {
      type: "application/pdf",
    });
    const res = await POST(formRequest({ caseId: "case_other", file }));
    const body = await res.json();

    expect(mockedAssert).toHaveBeenCalledWith("case_other", "cust_1", "customer");
    expect(mockedUpload).not.toHaveBeenCalled();
    expect(res.status).toBe(403);
    expect(body).toMatchObject({ success: false, error: "Forbidden" });
  });

  it("uploads when ownership assert passes", async () => {
    mockedGetApiUser.mockResolvedValue({ userId: "cust_1", role: "customer" });
    mockedAssert.mockResolvedValue(undefined);
    mockedUpload.mockResolvedValue({ id: "doc_1" } as never);

    const file = new File([new Uint8Array([1, 2, 3])], "passport.pdf", {
      type: "application/pdf",
    });
    const res = await POST(formRequest({ caseId: "case_1", file }));
    const body = await res.json();

    expect(mockedAssert).toHaveBeenCalledWith("case_1", "cust_1", "customer");
    expect(mockedUpload).toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(body).toMatchObject({ success: true });
  });

  it("skips ownership assert when caseId is omitted", async () => {
    mockedGetApiUser.mockResolvedValue({ userId: "cust_1", role: "customer" });
    mockedUpload.mockResolvedValue({ id: "doc_2" } as never);

    const file = new File([new Uint8Array([1, 2, 3])], "passport.pdf", {
      type: "application/pdf",
    });
    const res = await POST(formRequest({ file }));

    expect(mockedAssert).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
  });
});
