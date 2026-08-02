import { describe, expect, it } from "vitest";
import { adaptConciergeReply } from "@/lib/ai/adapt-reply";
import {
  emptyJourneyContext,
  inferTopicsFromMessage,
  updateJourneyContext,
} from "@/lib/ai/journey-context";
import { buildRuleBasedReply } from "@/lib/ai/rule-replies";

describe("journey topic inference", () => {
  it("detects motorcycle and property topics", () => {
    expect(inferTopicsFromMessage("I want a Honda Wave motorcycle")).toEqual(
      expect.arrayContaining(["motorcycle", "vehicle"])
    );
    expect(inferTopicsFromMessage("looking for a condo in Chiang Mai")).toContain(
      "property"
    );
  });
});

describe("goal change detection", () => {
  it("flags when the customer pivots from motorcycle to property", () => {
    const first = updateJourneyContext({
      previous: emptyJourneyContext(),
      userMessage: "Show me motorcycles",
      locale: "en",
    });
    expect(first.journey.primaryGoalKey).toBe("topic:motorcycle");
    expect(first.goalChange.changed).toBe(false);

    const second = updateJourneyContext({
      previous: first.journey,
      userMessage: "Actually I need a condo instead",
      locale: "en",
    });
    expect(second.goalChange.changed).toBe(true);
    expect(second.goalChange.fromKey).toBe("topic:motorcycle");
    expect(second.goalChange.toKey).toBe("topic:property");
  });

  it("does not flag the first message as a goal change", () => {
    const result = updateJourneyContext({
      previous: null,
      userMessage: "I need a driver's license",
      locale: "en",
    });
    expect(result.goalChange.changed).toBe(false);
    expect(result.journey.messageCount).toBe(1);
  });

  it("merges account life-event goals into journey memory", () => {
    const result = updateJourneyContext({
      previous: emptyJourneyContext(),
      userMessage: "hello",
      locale: "en",
      historyGoals: [
        {
          key: "life_event:moving-to-thailand",
          label: "Moving to Thailand",
          source: "life_event",
        },
      ],
    });
    expect(result.journey.activeGoals.some((g) => g.key.includes("moving"))).toBe(
      true
    );
  });
});

describe("adaptConciergeReply explanations", () => {
  it("attaches why / next-action blocks and recommendation reasons", () => {
    const base = buildRuleBasedReply("I viewed a motorcycle", "en");
    const journey = updateJourneyContext({
      previous: emptyJourneyContext(),
      userMessage: "I viewed a motorcycle",
      locale: "en",
    }).journey;

    const adapted = adaptConciergeReply({
      reply: base,
      locale: "en",
      journey: { ...journey, messageCount: 2 },
      goalChange: {
        changed: false,
        fromKey: null,
        toKey: null,
        fromLabel: null,
        toLabel: null,
      },
      suggestions: [
        {
          kind: "service",
          id: "vehicle-registration",
          title: "Vehicle Registration",
          reason: "You viewed a motorcycle — register ownership.",
          href: "/book/vehicle-registration",
          score: 100,
        },
      ],
      hasCustomerHistory: true,
    });

    expect(adapted.content).toMatch(/Why these suggestions/i);
    expect(adapted.content).toMatch(/Suggested next actions/i);
    expect(adapted.recommendations.some((r) => r.reason)).toBe(true);
    expect(adapted.explanations?.length).toBeGreaterThan(0);
  });

  it("announces goal changes in the reply", () => {
    const base = buildRuleBasedReply("I need a condo", "en");
    const adapted = adaptConciergeReply({
      reply: base,
      locale: "en",
      journey: emptyJourneyContext(),
      goalChange: {
        changed: true,
        fromKey: "topic:motorcycle",
        toKey: "topic:property",
        fromLabel: "Find / register a motorcycle",
        toLabel: "Find a home / property support",
      },
      suggestions: [],
    });
    expect(adapted.content).toMatch(/goal shifted/i);
  });
});
