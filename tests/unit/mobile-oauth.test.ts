import { afterEach, describe, expect, it, vi } from "vitest";

describe("mobile-oauth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows siamez and Expo redirect URIs", async () => {
    vi.stubEnv("API_JWT_SECRET", "test-secret-for-mobile-oauth");
    const { isAllowedMobileRedirectUri } = await import("@/lib/auth/mobile-oauth");
    expect(isAllowedMobileRedirectUri("siamez://")).toBe(true);
    expect(isAllowedMobileRedirectUri("siamez://oauth")).toBe(true);
    expect(isAllowedMobileRedirectUri("exp://127.0.0.1:8081")).toBe(true);
    expect(isAllowedMobileRedirectUri("https://evil.example/phish")).toBe(false);
    expect(isAllowedMobileRedirectUri("javascript:alert(1)")).toBe(false);
  });

  it("round-trips a short-lived code into an API JWT session payload", async () => {
    vi.stubEnv("API_JWT_SECRET", "test-secret-for-mobile-oauth");
    const { createMobileOAuthCode, exchangeMobileOAuthCode } = await import(
      "@/lib/auth/mobile-oauth"
    );
    const code = createMobileOAuthCode({
      id: "user_1",
      email: "a@example.com",
      role: "customer",
      name: "Ada",
    });
    const exchanged = await exchangeMobileOAuthCode(code);
    expect(exchanged.user).toEqual({
      id: "user_1",
      email: "a@example.com",
      name: "Ada",
      role: "customer",
    });
    expect(exchanged.token.split(".")).toHaveLength(3);
  });

  it("rejects tampered codes", async () => {
    vi.stubEnv("API_JWT_SECRET", "test-secret-for-mobile-oauth");
    const { createMobileOAuthCode, exchangeMobileOAuthCode } = await import(
      "@/lib/auth/mobile-oauth"
    );
    const code = createMobileOAuthCode({
      id: "user_1",
      email: "a@example.com",
      role: "customer",
    });
    const tampered = `${code.slice(0, -4)}abcd`;
    await expect(exchangeMobileOAuthCode(tampered)).rejects.toThrow(/Invalid/);
  });
});
