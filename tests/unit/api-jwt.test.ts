import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiJwtForUser, verifyApiJwt } from "@/lib/auth/api-jwt";

describe("api-jwt", () => {
  const prevApi = process.env.API_JWT_SECRET;
  const prevNext = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.API_JWT_SECRET = "test-api-jwt-secret-for-unit-tests";
    delete process.env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    if (prevApi === undefined) delete process.env.API_JWT_SECRET;
    else process.env.API_JWT_SECRET = prevApi;
    if (prevNext === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = prevNext;
  });

  it("creates a verifiable JWT with user claims", async () => {
    const token = await createApiJwtForUser({
      id: "user_1",
      email: "customer@example.com",
      role: "customer",
    });

    const payload = await verifyApiJwt(token);
    expect(payload).toEqual({
      userId: "user_1",
      email: "customer@example.com",
      role: "customer",
    });
  });

  it("rejects malformed tokens", async () => {
    await expect(verifyApiJwt("not-a-jwt")).rejects.toThrow("Invalid token");
  });

  it("rejects tampered signatures", async () => {
    const token = await createApiJwtForUser({
      id: "user_1",
      email: "customer@example.com",
      role: "customer",
    });
    const [header, payload, signature] = token.split(".");
    const flipped =
      signature[0] === "A"
        ? `B${signature.slice(1)}`
        : `A${signature.slice(1)}`;
    await expect(verifyApiJwt(`${header}.${payload}.${flipped}`)).rejects.toThrow(
      /Invalid token signature|Invalid token/
    );
  });

  it("rejects expired tokens", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url"
    );
    const payload = Buffer.from(
      JSON.stringify({
        sub: "user_1",
        email: "customer@example.com",
        role: "customer",
        iat: 1,
        exp: 2,
      })
    ).toString("base64url");
    const { createHmac } = await import("node:crypto");
    const signature = createHmac("sha256", process.env.API_JWT_SECRET!)
      .update(`${header}.${payload}`)
      .digest("base64url");

    await expect(verifyApiJwt(`${header}.${payload}.${signature}`)).rejects.toThrow(
      "Token expired"
    );
  });

  it("falls back to NEXTAUTH_SECRET when API_JWT_SECRET is unset", async () => {
    delete process.env.API_JWT_SECRET;
    process.env.NEXTAUTH_SECRET = "nextauth-fallback-secret";

    const token = await createApiJwtForUser({
      id: "user_2",
      email: "admin@siamez.com",
      role: "admin",
    });
    const payload = await verifyApiJwt(token);
    expect(payload.userId).toBe("user_2");
    expect(payload.role).toBe("admin");
  });
});
