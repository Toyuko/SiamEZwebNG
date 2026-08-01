import { describe, expect, it } from "vitest";
import { validateChatAttachment } from "@/lib/uploads/chat-attachment";
import { validateTrackingAttachment } from "@/lib/uploads/tracking-attachment";

function file(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 64))], { type });
  const f = new File([blob], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("upload validators (authz-adjacent)", () => {
  it("rejects empty or oversized chat attachments", () => {
    expect(validateChatAttachment(file("a.png", "image/png", 0))).toBe(
      "File is empty."
    );
    expect(
      validateChatAttachment(file("big.png", "image/png", 11 * 1024 * 1024))
    ).toBe("File too large (max 10 MB).");
  });

  it("rejects disallowed chat MIME types", () => {
    expect(
      validateChatAttachment(file("note.exe", "application/octet-stream", 100))
    ).toBe("Only images and PDF files are allowed.");
  });

  it("accepts allowed chat images and PDFs", () => {
    expect(validateChatAttachment(file("scan.pdf", "application/pdf", 100))).toBeNull();
    expect(validateChatAttachment(file("photo.jpg", "image/jpeg", 100))).toBeNull();
  });

  it("enforces stricter tracking attachment limits", () => {
    expect(
      validateTrackingAttachment(file("x.webp", "image/webp", 100))
    ).toBe("Only JPG, PNG, and PDF files are allowed.");
    expect(
      validateTrackingAttachment(file("big.jpg", "image/jpeg", 6 * 1024 * 1024))
    ).toBe("File too large (max 5 MB).");
    expect(validateTrackingAttachment(file("ok.png", "image/png", 100))).toBeNull();
  });
});
