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
import {
  buildConciergeSystemPrompt,
  containsPlaceholderUrl,
  sanitizeConciergeContent,
} from "@/lib/ai/sanitize-reply";

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

describe("ai concierge URL sanitization", () => {
  it("strips invented {cuid} markdown listing links", () => {
    const raw =
      'Need a license? Check services [here](https://siamez.com/sales/{cuid}). Tap Book below.';
    const cleaned = sanitizeConciergeContent(raw);
    expect(cleaned).not.toMatch(/\{cuid\}/i);
    expect(cleaned).not.toContain("siamez.com/sales");
    expect(cleaned.toLowerCase()).toContain("tap book");
    expect(containsPlaceholderUrl(cleaned)).toBe(false);
  });

  it("strips bare placeholder listing paths", () => {
    const raw =
      "Browse real estate /real-estate/{cuid} or vehicles /sales/{id} today.";
    const cleaned = sanitizeConciergeContent(raw);
    expect(cleaned).not.toMatch(/\{cuid\}|\{id\}/i);
    expect(cleaned).toContain("Browse real estate");
  });

  it("system prompt forbids placeholder listing templates", () => {
    const prompt = buildConciergeSystemPrompt({
      locale: "en",
      allowedBookPaths: [
        { name: "Driver's License", href: "/book/driver-license" },
      ],
      knownListingPaths: [],
    });
    expect(prompt).toContain("/book/driver-license");
    expect(prompt).toMatch(/NEVER invent URLs/i);
    expect(prompt).toMatch(/do not invent any \/sales/i);
  });
});

describe("quote payment concierge questions", () => {
  it("detects customer payment questions", async () => {
    const { isQuotePaymentQuestion } = await import("@/lib/ai/quote-payment-reply");
    expect(isQuotePaymentQuestion("Why do I only have to pay 10%?")).toBe(true);
    expect(isQuotePaymentQuestion("Can I pay the rest later?")).toBe(true);
    expect(isQuotePaymentQuestion("Are government fees included?")).toBe(true);
    expect(isQuotePaymentQuestion("How much do I owe?")).toBe(true);
    expect(isQuotePaymentQuestion("What is included?")).toBe(true);
    expect(isQuotePaymentQuestion("hello")).toBe(false);
  });
});
