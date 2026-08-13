import { describe, expect, it } from "vitest";
import { detectConciergeIntent } from "@/lib/ai/intents";
import { buildRuleBasedReply } from "@/lib/ai/rule-replies";
import {
  escalateHumanTool,
  escalationDeepLinks,
} from "@/lib/ai/tools/escalate-human";
import {
  DEFAULT_TAWK_PROPERTY_ID,
  DEFAULT_TAWK_WIDGET_ID,
  getTawkConfig,
  isTawkConfigured,
  isTawkOpenHref,
  summarizeConciergeForTawk,
  TAWK_OPEN_HREF,
  tawkEmbedSrc,
} from "@/lib/tawk";

describe("tawk config", () => {
  it("uses the SiamEZ widget by default", () => {
    expect(getTawkConfig({})).toEqual({
      propertyId: DEFAULT_TAWK_PROPERTY_ID,
      widgetId: DEFAULT_TAWK_WIDGET_ID,
    });
    expect(tawkEmbedSrc(getTawkConfig({})!)).toBe(
      "https://embed.tawk.to/695aa4100311b3197dea1777/1je511ot8"
    );
  });

  it("can be disabled", () => {
    expect(getTawkConfig({ NEXT_PUBLIC_TAWK_DISABLED: "true" })).toBeNull();
  });

  it("allows env overrides", () => {
    expect(
      getTawkConfig({
        NEXT_PUBLIC_TAWK_PROPERTY_ID: "abc123",
        NEXT_PUBLIC_TAWK_WIDGET_ID: "def456",
      })
    ).toEqual({ propertyId: "abc123", widgetId: "def456" });
  });

  it("rejects ids that are not alphanumeric", () => {
    expect(
      getTawkConfig({
        NEXT_PUBLIC_TAWK_PROPERTY_ID: "abc/123",
        NEXT_PUBLIC_TAWK_WIDGET_ID: "default",
      })
    ).toBeNull();
  });

  it("allows hyphenated widget ids", () => {
    expect(
      getTawkConfig({
        NEXT_PUBLIC_TAWK_PROPERTY_ID: "abc123",
        NEXT_PUBLIC_TAWK_WIDGET_ID: "default-widget",
      })
    ).toEqual({ propertyId: "abc123", widgetId: "default-widget" });
  });

  it("builds the embed URL", () => {
    expect(tawkEmbedSrc({ propertyId: "prop", widgetId: "wid" })).toBe(
      "https://embed.tawk.to/prop/wid"
    );
  });

  it("isTawkConfigured mirrors getTawkConfig", () => {
    expect(isTawkConfigured({})).toBe(true);
    expect(isTawkConfigured({ NEXT_PUBLIC_TAWK_DISABLED: "true" })).toBe(false);
  });
});

describe("tawk handoff helpers", () => {
  it("recognizes the live-chat href", () => {
    expect(isTawkOpenHref(TAWK_OPEN_HREF)).toBe(true);
    expect(isTawkOpenHref("/contact")).toBe(false);
  });

  it("summarizes recent concierge turns within 255 chars", () => {
    const summary = summarizeConciergeForTawk([
      { role: "user", content: "Need a visa" },
      { role: "assistant", content: "I can help with visa services." },
      { role: "user", content: "Talk to a person please" },
    ]);
    expect(summary).toContain("Customer: Need a visa");
    expect(summary).toContain("Ask SiamEZ:");
    expect(summary.length).toBeLessThanOrEqual(255);
  });

  it("falls back when there is no chat history", () => {
    expect(summarizeConciergeForTawk([])).toMatch(/Ask SiamEZ/);
  });
});

describe("escalate-human live chat", () => {
  it("puts tawk first when enabled", () => {
    const result = escalateHumanTool({
      context: "Need visa help",
      locale: "en",
      tawkEnabled: true,
    });
    expect(result.liveChatEnabled).toBe(true);
    expect(result.message.toLowerCase()).toContain("live chat");
    const links = escalationDeepLinks(result);
    expect(links[0]).toEqual({
      href: TAWK_OPEN_HREF,
      label: "Chat with staff",
      kind: "live_chat",
    });
    expect(links.some((l) => l.href.includes("whatsapp.com"))).toBe(true);
  });

  it("omits tawk when disabled", () => {
    const result = escalateHumanTool({ locale: "en", tawkEnabled: false });
    expect(result.liveChatEnabled).toBe(false);
    expect(escalationDeepLinks(result).some((l) => l.kind === "live_chat")).toBe(
      false
    );
  });
});

describe("live chat intent", () => {
  it("detects talk-to-person and live-chat phrasing", () => {
    expect(detectConciergeIntent("I want to talk to a person")).toEqual({
      kind: "escalate",
    });
    expect(detectConciergeIntent("open live chat")).toEqual({ kind: "escalate" });
    expect(detectConciergeIntent("แชทสด")).toEqual({ kind: "escalate" });
  });

  it("rule replies still include WhatsApp when tawk is off", () => {
    const reply = buildRuleBasedReply("Please connect me to a real person", "en");
    expect(reply.deepLinks?.some((l) => l.href.includes("whatsapp.com"))).toBe(
      true
    );
  });
});
