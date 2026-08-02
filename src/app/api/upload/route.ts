import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getJobChatParticipant } from "@/data-access/job-chat";
import { resolveApiUserId } from "@/lib/auth/resolveApiUserId";
import { validateChatAttachment } from "@/lib/uploads/chat-attachment";
import { validateTrackingAttachment } from "@/lib/uploads/tracking-attachment";
import { assertFreelancerCanUpdateJobTracking } from "@/lib/jobs/tracking-access";
import {
  isAllowedUploadKind,
  sniffFileHead,
} from "@/lib/security/magic-bytes";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

function safeFileSegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
}

/**
 * POST /api/upload
 * - Default (sales listings / payment proofs): image/video upload — requires
 *   authenticated web session or mobile Bearer JWT.
 * - Track & Trace: pass `jobId` + `purpose=tracking` — requires freelancer session,
 *   accepts JPG/PNG/PDF up to 5MB, returns { url, key, name }.
 * - Job chat: pass `jobId` + `purpose=chat` — requires client or freelancer on the job,
 *   accepts images and PDF up to 10MB, returns { url, key, name }.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(
      clientKeyFromRequest(request, "upload"),
      40,
      60_000
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const purpose = formData.get("purpose");
    const jobId = formData.get("jobId");

    if (typeof jobId === "string" && jobId.length > 0) {
      if (purpose === "tracking") {
        return handleTrackingUpload(request, file, jobId);
      }
      if (purpose === "chat") {
        return handleChatUpload(request, file, jobId);
      }
    }

    return handleGeneralUpload(request, file);
  } catch (e) {
    console.error("Upload error:", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function handleTrackingUpload(request: NextRequest, file: File, jobId: string) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertFreelancerCanUpdateJobTracking(userId, jobId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const validationError = validateTrackingAttachment(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured on the server" },
      { status: 500 }
    );
  }

  const pathname = `job-tracking/${jobId}/${Date.now()}-${safeFileSegment(file.name)}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    key: blob.url,
    name: file.name,
  });
}

async function handleChatUpload(request: NextRequest, file: File, jobId: string) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participant = await getJobChatParticipant(jobId, userId);
  if (!participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const validationError = validateChatAttachment(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured on the server" },
      { status: 500 }
    );
  }

  const pathname = `job-chat/${jobId}/${Date.now()}-${safeFileSegment(file.name)}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    key: blob.url,
    name: file.name,
  });
}

async function handleGeneralUpload(request: NextRequest, file: File) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mimeType = file.type.toLowerCase();
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload an image or video file." },
      { status: 400 }
    );
  }

  const sniffed = await sniffFileHead(file);
  if (!isAllowedUploadKind(sniffed, "media")) {
    return NextResponse.json(
      { error: "File content does not match an allowed image/video type." },
      { status: 400 }
    );
  }

  const maxSize = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: isVideo ? "Video too large (max 100 MB)" : "Image too large (max 10 MB)" },
      { status: 400 }
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured on the server" },
      { status: 500 }
    );
  }

  const pathname = `sales-listings/${Date.now()}-${safeFileSegment(file.name)}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    key: blob.url,
  });
}
