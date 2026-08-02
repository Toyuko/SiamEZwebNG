import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimitBucketsForTests,
} from "@/lib/security/rate-limit";
import {
  isAllowedUploadKind,
  sniffMagicBytes,
} from "@/lib/security/magic-bytes";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
  });

  it("allows under the limit and blocks when exceeded", () => {
    expect(checkRateLimit("t:1", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit("t:1", 2, 60_000).allowed).toBe(true);
    const blocked = checkRateLimit("t:1", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("magic bytes", () => {
  it("sniffs jpeg and pdf headers", () => {
    expect(sniffMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "jpeg"
    );
    expect(
      sniffMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    ).toBe("pdf");
    expect(isAllowedUploadKind("jpeg", "media")).toBe(true);
    expect(isAllowedUploadKind("unknown", "media")).toBe(false);
  });
});
