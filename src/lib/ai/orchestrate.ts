"use server";

import * as lifeEventsDA from "@/data-access/life-events";
import * as workflowsDA from "@/data-access/workflows";
import { syncLinkedGoalsFromLifeEvent } from "@/data-access/goals";
import { getSession } from "@/lib/auth";
import type { ConciergeIntent } from "@/lib/ai/intents";
import {
  escalateHumanTool,
  escalationDeepLinks,
} from "@/lib/ai/tools/escalate-human";
import type { ConciergeLocale, ConciergeReply } from "@/lib/ai/types";
import { buildLifeEventRecommendationPath } from "@/lib/recommendations";

const COPY = {
  en: {
    startLifeEvent: (title: string) =>
      `I've started "${title}" for you. Open your checklist to see the next steps.`,
    startLifeEventGuest: (title: string) =>
      `Sign in to start "${title}" and track your checklist in the portal.`,
    startWorkflow: (title: string) =>
      `I've started the "${title}" workflow. Continue in your portal.`,
    startWorkflowGuest: (title: string) =>
      `Sign in to start "${title}" and track progress in the portal.`,
    signIn: "Sign in to continue",
    openChecklist: "Open checklist",
    openWorkflows: "Open workflows",
    notFound: "That journey isn't available right now. Browse goals or ask for help.",
  },
  th: {
    startLifeEvent: (title: string) =>
      `เริ่ม "${title}" ให้แล้ว เปิดเช็กลิสต์เพื่อดูขั้นตอนถัดไป`,
    startLifeEventGuest: (title: string) =>
      `เข้าสู่ระบบเพื่อเริ่ม "${title}" และติดตามเช็กลิสต์ในพอร์ทัล`,
    startWorkflow: (title: string) =>
      `เริ่มเวิร์กโฟลว์ "${title}" แล้ว ดำเนินการต่อในพอร์ทัล`,
    startWorkflowGuest: (title: string) =>
      `เข้าสู่ระบบเพื่อเริ่ม "${title}" และติดตามความคืบหน้าในพอร์ทัล`,
    signIn: "เข้าสู่ระบบเพื่อดำเนินการต่อ",
    openChecklist: "เปิดเช็กลิสต์",
    openWorkflows: "เปิดเวิร์กโฟลว์",
    notFound: "ไม่พบเส้นทางนี้ในขณะนี้ ลองดูเป้าหมายหรือขอความช่วยเหลือ",
  },
} as const;

function loginRedirectPath(path: string): string {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

/**
 * Execute authenticated Concierge mutations (life event / workflow start) or
 * return guest login deep links. Escalation returns tawk.to (when configured)
 * plus WhatsApp / LINE fallbacks.
 */
export async function applyConciergeOrchestration(input: {
  intent: ConciergeIntent;
  locale: ConciergeLocale;
  userMessage: string;
  baseReply: ConciergeReply;
}): Promise<ConciergeReply> {
  const { intent, locale, userMessage, baseReply } = input;
  const copy = COPY[locale] ?? COPY.en;

  if (intent.kind === "escalate") {
    const escalation = escalateHumanTool({ context: userMessage, locale });
    return {
      content: escalation.message,
      recommendations: baseReply.recommendations,
      deepLinks: [...escalationDeepLinks(escalation), ...(baseReply.deepLinks ?? [])],
      mode: baseReply.mode,
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;

  if (intent.kind === "start_life_event") {
    const event = await lifeEventsDA.getLifeEventByKey(intent.lifeEventKey);
    if (!event?.active) {
      return {
        content: copy.notFound,
        recommendations: baseReply.recommendations,
        deepLinks: baseReply.deepLinks,
        mode: "rule",
      };
    }
    const title =
      locale === "th" && event.titleTh ? event.titleTh : event.titleEn;
    const goalsPath = buildLifeEventRecommendationPath(intent.lifeEventKey);

    if (!userId) {
      return {
        content: copy.startLifeEventGuest(title),
        recommendations: baseReply.recommendations,
        deepLinks: [
          {
            href: loginRedirectPath(goalsPath),
            label: copy.signIn,
            kind: "life_event",
          },
          ...(baseReply.deepLinks ?? []),
        ],
        mode: "rule",
      };
    }

    await lifeEventsDA.startLifeEventForUser(userId, event.id);
    await syncLinkedGoalsFromLifeEvent(userId, event.id);

    return {
      content: copy.startLifeEvent(title),
      recommendations: baseReply.recommendations,
      deepLinks: [
        { href: goalsPath, label: copy.openChecklist, kind: "life_event" },
        ...(baseReply.deepLinks ?? []),
      ],
      mode: "rule",
    };
  }

  if (intent.kind === "start_workflow") {
    const template = await workflowsDA.getTemplateByKey(intent.workflowKey);
    if (!template?.active) {
      return {
        content: copy.notFound,
        recommendations: baseReply.recommendations,
        deepLinks: baseReply.deepLinks,
        mode: "rule",
      };
    }
    const title =
      locale === "th" && template.titleTh ? template.titleTh : template.titleEn;
    const workflowsPath = "/portal/workflows";

    if (!userId) {
      return {
        content: copy.startWorkflowGuest(title),
        recommendations: baseReply.recommendations,
        deepLinks: [
          {
            href: loginRedirectPath(workflowsPath),
            label: copy.signIn,
            kind: "search",
          },
          ...(baseReply.deepLinks ?? []),
        ],
        mode: "rule",
      };
    }

    await workflowsDA.startWorkflowRun(userId, template.id);

    return {
      content: copy.startWorkflow(title),
      recommendations: baseReply.recommendations,
      deepLinks: [
        { href: workflowsPath, label: copy.openWorkflows, kind: "search" },
        ...(baseReply.deepLinks ?? []),
      ],
      mode: "rule",
    };
  }

  return baseReply;
}
