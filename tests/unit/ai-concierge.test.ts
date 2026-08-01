import { afterEach, describe, expect, it } from "vitest";
import { buildRuleBasedReply } from "@/lib/ai/rule-replies";
import {
  getPopularRecommendations,
  searchCatalogServices,
} from "@/lib/ai/recommend";
import {
  MemoryConversationStore,
  createEmptySession,
} from "@/lib/ai/session-storage";
import { collectStream, mockTokenStream } from "@/lib/ai/stream";
import {
  bookingPathForSlug,
  searchServicesTool,
} from "@/lib/ai/tools/search-services";
import { generateLocalConciergeReply } from "@/lib/ai/chat";

describe("ai concierge recommend", () => {
  it("returns popular services when query is empty", () => {
    const popular = getPopularRecommendations("en", 3);
    expect(popular.length).toBeGreaterThan(0);
    expect(popular[0]?.slug).toBeTruthy();
    expect(popular[0]?.name).toBeTruthy();
  });

  it("finds driver license via fuse search", () => {
    const results = searchCatalogServices("thai driving licence bangkok", "en", 5);
    expect(results.some((r) => r.slug === "driver-license")).toBe(true);
  });

  it("finds visa services in Thai", () => {
    const results = searchCatalogServices("วีซ่า", "th", 5);
    expect(results.some((r) => r.slug === "visa-services")).toBe(true);
  });
});

describe("ai concierge rule replies", () => {
  it("greets and attaches popular recommendations", () => {
    const reply = buildRuleBasedReply("hello", "en");
    expect(reply.mode).toBe("rule");
    expect(reply.content.toLowerCase()).toContain("concierge");
    expect(reply.recommendations.length).toBeGreaterThan(0);
  });

  it("returns catalog matches for a concrete need", () => {
    const reply = generateLocalConciergeReply(
      "I need certified translation",
      "en"
    );
    expect(reply.recommendations.length).toBeGreaterThan(0);
    expect(
      reply.recommendations.some(
        (r) =>
          r.slug === "translation-services" || r.slug === "basic-translation"
      )
    ).toBe(true);
  });

  it("handles Thai help intent", () => {
    const reply = buildRuleBasedReply("ช่วย", "th");
    expect(reply.content.length).toBeGreaterThan(10);
    expect(reply.recommendations.length).toBeGreaterThan(0);
  });
});

describe("ai concierge tools", () => {
  it("builds booking deep links", () => {
    expect(bookingPathForSlug("marriage-registration")).toBe(
      "/book/marriage-registration"
    );
  });

  it("searchServicesTool returns popular when asked", () => {
    const result = searchServicesTool({
      locale: "en",
      popularOnly: true,
      limit: 2,
    });
    expect(result.recommendations).toHaveLength(2);
    expect(result.bookPathTemplate).toBe("/book/[slug]");
  });
});

describe("ai concierge stream", () => {
  it("mockTokenStream yields growing prefixes", async () => {
    const chunks: string[] = [];
    for await (const chunk of mockTokenStream("Hello world", { delayMs: 0 })) {
      chunks.push(chunk);
    }
    expect(chunks.at(-1)).toBe("Hello world");
    expect(await collectStream(mockTokenStream("A B", { delayMs: 0 }))).toBe(
      "A B"
    );
  });
});

describe("ai concierge session store", () => {
  const store = new MemoryConversationStore();

  afterEach(() => {
    store.clear("test-session");
  });

  it("saves and loads sessions", () => {
    const session = createEmptySession("en", "test-session");
    session.messages.push({
      id: "m1",
      role: "user",
      content: "hi",
      createdAt: new Date().toISOString(),
    });
    store.save(session);
    const loaded = store.load("test-session");
    expect(loaded?.messages).toHaveLength(1);
    expect(loaded?.locale).toBe("en");
    expect(loaded?.version).toBe(1);
  });
});
