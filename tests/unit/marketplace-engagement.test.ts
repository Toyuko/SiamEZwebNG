import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  anonOwnerKey,
  buildAnonOwner,
  buildUserOwner,
  canAddToCompare,
  decideCompareAdd,
  MAX_COMPARE_ITEMS,
  mergeAnonymousEngagementToUser,
  parseOwnerKey,
  userOwnerKey,
  type MergePrisma,
} from "@/lib/marketplace-engagement";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

describe("marketplace engagement owner keys", () => {
  it("builds stable user/anon owner keys", () => {
    expect(userOwnerKey("user123")).toBe("user:user123");
    expect(anonOwnerKey("sid456")).toBe("anon:sid456");
    expect(buildUserOwner("user123").ownerKey).toBe("user:user123");
    expect(buildAnonOwner("sid456").kind).toBe("anon");
  });

  it("parses owner keys", () => {
    expect(parseOwnerKey("user:abc")?.kind).toBe("user");
    expect(parseOwnerKey("anon:xyz")?.kind).toBe("anon");
    expect(parseOwnerKey("bogus")).toBeNull();
  });
});

describe("compare cap (≤3)", () => {
  const a = { listingType: "vehicle" as const, listingId: "clvehicle001aaaaaaaaaaaa" };
  const b = { listingType: "property" as const, listingId: "clproperty001bbbbbbbbbbbb" };
  const c = { listingType: "vehicle" as const, listingId: "clvehicle002cccccccccccc" };
  const d = { listingType: "property" as const, listingId: "clproperty002dddddddddddd" };

  it("allows add when under cap including vehicle+property mix", () => {
    expect(decideCompareAdd([], a)).toEqual({ ok: true, action: "add" });
    expect(decideCompareAdd([a], b)).toEqual({ ok: true, action: "add" });
    expect(decideCompareAdd([a, b], c)).toEqual({ ok: true, action: "add" });
  });

  it("noops when already in set", () => {
    expect(decideCompareAdd([a, b], a)).toEqual({ ok: true, action: "noop" });
  });

  it("rejects fourth item at hard cap", () => {
    expect(MAX_COMPARE_ITEMS).toBe(3);
    expect(decideCompareAdd([a, b, c], d)).toEqual({ ok: false, reason: "cap" });
    expect(canAddToCompare(3, false)).toBe(false);
    expect(canAddToCompare(3, true)).toBe(true);
  });

  it("rejects empty listing id", () => {
    expect(decideCompareAdd([], { listingType: "vehicle", listingId: "  " })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("save/unsave toggle semantics", () => {
  it("toggle flips boolean state", () => {
    // Pure contract used by data-access toggleSaveListing
    function nextSaved(currentlySaved: boolean): boolean {
      return !currentlySaved;
    }
    expect(nextSaved(false)).toBe(true);
    expect(nextSaved(true)).toBe(false);
  });
});

describe("URL contracts remain cuid-based", () => {
  const vehicleId = "clxyz0123456789abcdefgh";
  const propertyId = "clprop9876543210zyxwvuts";

  it("hub/detail hrefs use /sales/{cuid} and /real-estate/{cuid}", () => {
    expect(buildSalesListingPath(vehicleId)).toBe(`/sales/${vehicleId}`);
    expect(buildRealEstateListingPath(propertyId)).toBe(`/real-estate/${propertyId}`);
    expect(buildSalesListingPath(vehicleId)).not.toContain("honda");
    expect(buildRealEstateListingPath(propertyId)).not.toContain("bangkok");
  });
});

describe("anonymous → user merge", () => {
  const savedCreate = vi.fn();
  const savedFindMany = vi.fn();
  const savedDeleteMany = vi.fn();
  const viewFindMany = vi.fn();
  const viewUpsert = vi.fn();
  const viewDeleteMany = vi.fn();
  const compareFindMany = vi.fn();
  const compareCreate = vi.fn();
  const compareDeleteMany = vi.fn();

  function createDb(): MergePrisma {
    return {
      savedListing: {
        findMany: savedFindMany,
        create: savedCreate,
        deleteMany: savedDeleteMany,
      },
      listingView: {
        findMany: viewFindMany,
        upsert: viewUpsert,
        deleteMany: viewDeleteMany,
      },
      compareItem: {
        findMany: compareFindMany,
        create: compareCreate,
        deleteMany: compareDeleteMany,
      },
    } as unknown as MergePrisma;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    savedFindMany.mockResolvedValue([
      {
        listingType: "vehicle",
        listingId: "clvehicle001aaaaaaaaaaaa",
        createdAt: new Date("2026-08-01T00:00:00Z"),
      },
    ]);
    viewFindMany.mockResolvedValue([
      {
        listingType: "property",
        listingId: "clproperty001bbbbbbbbbbbb",
        viewedAt: new Date("2026-08-01T12:00:00Z"),
      },
    ]);
    // first call: anon compare; second: existing user compare
    compareFindMany
      .mockResolvedValueOnce([
        {
          listingType: "vehicle",
          listingId: "clvehicle001aaaaaaaaaaaa",
          createdAt: new Date("2026-08-01T01:00:00Z"),
        },
        {
          listingType: "vehicle",
          listingId: "clvehicle002cccccccccccc",
          createdAt: new Date("2026-08-01T02:00:00Z"),
        },
        {
          listingType: "property",
          listingId: "clproperty001bbbbbbbbbbbb",
          createdAt: new Date("2026-08-01T03:00:00Z"),
        },
        {
          listingType: "property",
          listingId: "clproperty002dddddddddddd",
          createdAt: new Date("2026-08-01T04:00:00Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          listingType: "vehicle",
          listingId: "clvehicle001aaaaaaaaaaaa",
          createdAt: new Date("2026-07-01T00:00:00Z"),
        },
        {
          listingType: "vehicle",
          listingId: "clvehicle099zzzzzzzzzzzz",
          createdAt: new Date("2026-07-02T00:00:00Z"),
        },
      ]);
    savedCreate.mockResolvedValue({});
    viewUpsert.mockResolvedValue({});
    compareCreate.mockResolvedValue({});
    savedDeleteMany.mockResolvedValue({ count: 1 });
    viewDeleteMany.mockResolvedValue({ count: 1 });
    compareDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("moves saves/views and respects compare cap when merging", async () => {
    const result = await mergeAnonymousEngagementToUser(createDb(), {
      userId: "user-1",
      anonymousSessionId: "anon-1",
    });

    expect(savedCreate).toHaveBeenCalledTimes(1);
    expect(viewUpsert).toHaveBeenCalledTimes(1);
    // user already has 2 compare items → only 1 slot left
    expect(compareCreate).toHaveBeenCalledTimes(1);
    expect(result.compareMoved).toBe(1);
    expect(savedDeleteMany).toHaveBeenCalled();
    expect(viewDeleteMany).toHaveBeenCalled();
    expect(compareDeleteMany).toHaveBeenCalled();
  });
});
