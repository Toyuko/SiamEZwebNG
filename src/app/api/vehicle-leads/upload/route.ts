import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  isAllowedUploadKind,
  sniffFileHead,
} from "@/lib/security/magic-bytes";
import { createUploadPlaceholderKey } from "@/lib/vehicle-leads/submit";
import { PRIVATE_MEDIA_CATEGORIES, VEHICLE_MEDIA_CATEGORIES } from "@/config/vehicle-intake";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

function safeFileSegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
}

/**
 * Guest-safe vehicle intake upload. Rate-limited. Does not require an account.
 * Registration documents are stored with a less guessable path and flagged private
 * by the submit API based on category.
 */
export async function POST(request: Request) {
  const rl = checkRateLimit(clientKeyFromRequest(request, "vehicle-upload"), 20, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const categoryRaw = String(formData.get("category") ?? "other");
    const category = VEHICLE_MEDIA_CATEGORIES.includes(
      categoryRaw as (typeof VEHICLE_MEDIA_CATEGORIES)[number]
    )
      ? categoryRaw
      : "other";

    const mimeType = file.type.toLowerCase();
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");
    const isPdf = mimeType === "application/pdf";
    if (!isImage && !isVideo && !isPdf) {
      return NextResponse.json(
        { error: "Please upload an image, video, or PDF." },
        { status: 400 }
      );
    }

    const sniffed = await sniffFileHead(file);
    const purpose = isPdf || category === "registration" ? "document" : isVideo ? "media" : "image";
    if (!isAllowedUploadKind(sniffed, purpose === "document" ? "document" : purpose === "media" ? "media" : "image")) {
      return NextResponse.json(
        { error: "File content does not match an allowed type." },
        { status: 400 }
      );
    }

    const max = isVideo ? MAX_VIDEO_BYTES : isPdf ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
    if (file.size > max) {
      return NextResponse.json(
        {
          error: isVideo
            ? "Video too large (max 80 MB)"
            : "File too large (max 10 MB)",
        },
        { status: 400 }
      );
    }

    const mediaType = isVideo ? "video" : isPdf ? "document" : "image";
    const isPrivate = PRIVATE_MEDIA_CATEGORIES.has(category) || mediaType === "document";
    let storageKey = createUploadPlaceholderKey(file.name);

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const folder = isPrivate ? "vehicle-leads/private" : "vehicle-leads/public";
      const blob = await put(
        `${folder}/${Date.now()}-${safeFileSegment(file.name)}`,
        file,
        { access: "public", addRandomSuffix: true }
      );
      storageKey = blob.url;
    }

    return NextResponse.json({
      name: file.name,
      storageKey,
      mimeType: file.type || undefined,
      size: file.size,
      mediaType,
      category,
      isPrivate,
    });
  } catch (error) {
    console.error("[vehicle-upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
