import { describe, expect, it } from "vitest";
import {
  displayNameFromEmail,
  PUBLIC_REGISTRATION_ROLE,
  resolvePublicRegistrationRole,
} from "@/lib/auth/public-registration";

describe("public registration role", () => {
  it("allows customer, freelancer, and company self-serve roles", () => {
    expect(resolvePublicRegistrationRole(undefined)).toBe("customer");
    expect(resolvePublicRegistrationRole(null)).toBe("customer");
    expect(resolvePublicRegistrationRole("customer")).toBe("customer");
    expect(resolvePublicRegistrationRole("freelancer")).toBe("freelancer");
    expect(resolvePublicRegistrationRole("company")).toBe("company");
    expect(resolvePublicRegistrationRole("corporate")).toBe("company");
    expect(PUBLIC_REGISTRATION_ROLE).toBe("customer");
  });

  it("never assigns privileged roles from client-supplied account type", () => {
    expect(resolvePublicRegistrationRole("admin")).toBe("customer");
    expect(resolvePublicRegistrationRole("staff")).toBe("customer");
    expect(resolvePublicRegistrationRole("ADMIN")).toBe("customer");
    expect(resolvePublicRegistrationRole("something-else")).toBe("customer");
  });

  it("derives a display name from email when none is provided", () => {
    expect(displayNameFromEmail("ada@example.com")).toBe("ada");
    expect(displayNameFromEmail("")).toBe("Customer");
  });
});
