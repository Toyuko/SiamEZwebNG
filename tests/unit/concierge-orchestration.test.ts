import { describe, expect, it } from "vitest";
import { detectConciergeIntent } from "@/lib/ai/intents";
import { escalateHumanTool } from "@/lib/ai/tools/escalate-human";
import { buildRuleBasedReply, hasOrchestrationIntent } from "@/lib/ai/rule-replies";

describe("concierge intent detection", () => {
  it("detects human escalation", () => {
    expect(detectConciergeIntent("I want to speak to a human")).toEqual({
      kind: "escalate",
    });
    expect(detectConciergeIntent("ขอคุยกับเจ้าหน้าที่")).toEqual({
      kind: "escalate",
    });
  });

  it("detects moving-to-thailand life event", () => {
    expect(detectConciergeIntent("I'm moving to Thailand next month")).toEqual({
      kind: "start_life_event",
      lifeEventKey: "moving-to-thailand",
    });
  });

  it("detects workflow intents", () => {
    expect(detectConciergeIntent("Book a vehicle inspection")).toEqual({
      kind: "start_workflow",
      workflowKey: "vehicle-inspection-booking",
    });
    expect(detectConciergeIntent("property viewing appointment")).toEqual({
      kind: "start_workflow",
      workflowKey: "property-viewing-booking",
    });
  });

  it("hasOrchestrationIntent mirrors detection", () => {
    expect(hasOrchestrationIntent("talk to staff please")).toBe(true);
    expect(hasOrchestrationIntent("certified translation")).toBe(false);
  });
});

describe("escalate-human tool", () => {
  it("builds WhatsApp URL with context", () => {
    const result = escalateHumanTool({
      context: "Need visa help",
      locale: "en",
      tawkEnabled: false,
    });
    expect(result.whatsappUrl).toContain("whatsapp.com");
    expect(result.whatsappUrl).toContain(encodeURIComponent("Need visa help"));
    expect(result.whatsappLabel).toBe("Chat on WhatsApp");
    expect(result.liveChatEnabled).toBe(false);
  });
});

describe("rule replies orchestration hints", () => {
  it("returns escalation deep links for human intent", () => {
    const reply = buildRuleBasedReply("Please connect me to a real person", "en");
    expect(reply.deepLinks?.some((l) => l.href.includes("whatsapp.com"))).toBe(true);
  });

  it("returns journey hint for moving intent", () => {
    const reply = buildRuleBasedReply("We are relocating to Thailand", "en");
    expect(reply.content.toLowerCase()).toMatch(/journey|checklist|starting/);
    expect(reply.deepLinks?.some((l) => l.href.includes("/portal/goals"))).toBe(true);
  });
});
