import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS } from "@/lib/feature-flags";

describe("feature flag defaults", () => {
  it("defines conservative defaults for experimental features", () => {
    expect(DEFAULT_FLAGS.experimental_ai).toBe(false);
    expect(DEFAULT_FLAGS.beta_analytics).toBe(false);
    expect(typeof DEFAULT_FLAGS.marketplace_beta).toBe("boolean");
  });
});
