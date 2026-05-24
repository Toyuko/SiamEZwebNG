import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { ok, fail } from "@/lib/api-response";
import { getJobChatParticipant } from "@/data-access/job-chat";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return fail("File upload is not configured", 503);
    }

    const formData = await request.formData();
    const jobId = String(formData.get("jobId") ?? "").trim();
    const file = formData.get("file");

    if (!jobId) {
      return fail("jobId is required", 400);
    }

    const participant = await getJobChatParticipant(jobId, session.user.id);
    if (!participant) {
      return fail("Forbidden", 403);
    }

    if (!(file instanceof File) || file.size <= 0) {
      return fail("File is required", 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("File too large (max 10 MB)", 400);
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return fail("Unsupported file type", 400);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`job-chat/${jobId}/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return ok({ url: blob.url, name: file.name, mimeType: file.type || null }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return fail(message, 500);
  }
}
