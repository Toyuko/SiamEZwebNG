import { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth/getApiUser";
import { uploadAndCreateDocument } from "@/lib/domain/documents";
import { ok, fail } from "@/lib/api-response";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const formData = await request.formData();
    const caseIdRaw = String(formData.get("caseId") ?? "").trim();
    const documentType = String(formData.get("documentType") ?? "").trim() || undefined;
    const file = formData.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      return fail("File is required", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("File too large (max 10 MB)", 400);
    }

    const document = await uploadAndCreateDocument({
      file,
      caseId: caseIdRaw || null,
      uploadedBy: userId,
      documentType,
    });

    return ok(document, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
