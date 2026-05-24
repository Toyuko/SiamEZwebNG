import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { ok, fail } from "@/lib/api-response";
import { validateTrackingAttachment } from "@/lib/uploads/tracking-attachment";
import { submitClientJobDocument } from "@/lib/jobs/client-document-upload";

function safeFileSegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const { id: jobId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const note = formData.get("note");

    if (!(file instanceof File) || file.size <= 0) {
      return fail("No file provided", 400);
    }

    const validationError = validateTrackingAttachment(file);
    if (validationError) {
      return fail(validationError, 400);
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return fail("File storage is not configured on the server", 500);
    }

    const pathname = `job-tracking/${jobId}/client/${Date.now()}-${safeFileSegment(file.name)}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const result = await submitClientJobDocument(
      session.user.id,
      jobId,
      { url: blob.url, name: file.name },
      typeof note === "string" ? note : null
    );

    if ("error" in result) {
      return fail(result.error ?? "Upload failed", 400);
    }

    return ok({
      url: blob.url,
      name: file.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    if (message === "Forbidden") {
      return fail("Forbidden", 403);
    }
    return fail(message, 500);
  }
}
