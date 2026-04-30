import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

/**
 * POST /api/upload
 * Upload file to Vercel Blob. Returns { url, key } for document creation.
 * Body: FormData with file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    const pathname = `sales-listings/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      key: blob.url,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
