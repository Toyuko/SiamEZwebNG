import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";

describe("isAdminAuthBypassEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when BYPASS_ADMIN_AUTH is unset", () => {
    vi.stubEnv("BYPASS_ADMIN_AUTH", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isAdminAuthBypassEnabled()).toBe(false);
  });

  it("allows bypass in development", () => {
    vi.stubEnv("BYPASS_ADMIN_AUTH", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isAdminAuthBypassEnabled()).toBe(true);
  });

  it("blocks bypass in Vercel production", () => {
    vi.stubEnv("BYPASS_ADMIN_AUTH", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isAdminAuthBypassEnabled()).toBe(false);
    err.mockRestore();
  });

  it("blocks bypass in Vercel preview", () => {
    vi.stubEnv("BYPASS_ADMIN_AUTH", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isAdminAuthBypassEnabled()).toBe(false);
    err.mockRestore();
  });

  it("blocks bypass when NODE_ENV=production without Vercel", () => {
    vi.stubEnv("BYPASS_ADMIN_AUTH", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isAdminAuthBypassEnabled()).toBe(false);
    err.mockRestore();
  });
});
