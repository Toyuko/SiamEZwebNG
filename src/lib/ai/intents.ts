/**
 * Pure intent detection for Concierge orchestration (life events, workflows, escalation).
 */

export type ConciergeIntent =
  | { kind: "escalate" }
  | { kind: "start_life_event"; lifeEventKey: string }
  | { kind: "start_workflow"; workflowKey: string };

const ESCALATE_RE =
  /\b(speak\s+to\s+(a\s+)?(human|person|agent|staff|coordinator)|talk\s+to\s+(someone|staff)|real\s+person|human\s+help|call\s+me|whatsapp|line\s+official)\b|(?:ติดต่อเจ้าหน้าที่|คุยกับ(?:คน|เจ้าหน้าที่)|พูดคุยกับเจ้าหน้าที่|ขอคุยกับเจ้าหน้าที่|ขอคนจริง|โทรหา|แชทกับเจ้าหน้าที่)/i;

const LIFE_EVENT_INTENTS: Array<{ key: string; re: RegExp }> = [
  {
    key: "moving-to-thailand",
    re: /moving\s+to\s+thailand|move\s+to\s+thailand|relocat(e|ing)\s+to\s+thailand|settle\s+in\s+thailand|ย้ายมา(อยู่)?(ประเทศ)?ไทย|ตั้งถิ่นฐาน|ย้ายถิ่น/i,
  },
];

const WORKFLOW_INTENTS: Array<{ key: string; re: RegExp }> = [
  {
    key: "vehicle-inspection-booking",
    re: /vehicle\s+inspection|inspection\s+booking|book\s+(a\s+)?(vehicle\s+)?inspection|ตรวจสภาพรถ|จองตรวจสภาพ/i,
  },
  {
    key: "property-viewing-booking",
    re: /property\s+viewing|viewing\s+appointment|book\s+(a\s+)?viewing|condo\s+viewing|house\s+viewing|นัดชม(ทรัพย์|บ้าน|คอนโด)|จองชมทรัพย์/i,
  },
];

const START_JOURNEY_RE =
  /\b(start\s+(my\s+)?(journey|checklist|life\s+event)|begin\s+(the\s+)?(moving|settling)\s+(journey|checklist)|เริ่ม(เช็กลิสต์|เส้นทาง|การเดินทาง))\b/i;

const START_WORKFLOW_RE =
  /\b(start\s+(a\s+)?workflow|begin\s+workflow|เริ่มเวิร์กโฟลว์|เริ่ม workflow)\b/i;

export function detectConciergeIntent(message: string): ConciergeIntent | null {
  const text = message.trim();
  if (!text) return null;

  if (ESCALATE_RE.test(text)) {
    return { kind: "escalate" };
  }

  for (const item of LIFE_EVENT_INTENTS) {
    if (item.re.test(text)) {
      return { kind: "start_life_event", lifeEventKey: item.key };
    }
  }

  if (START_JOURNEY_RE.test(text)) {
    return { kind: "start_life_event", lifeEventKey: "moving-to-thailand" };
  }

  for (const item of WORKFLOW_INTENTS) {
    if (item.re.test(text)) {
      return { kind: "start_workflow", workflowKey: item.key };
    }
  }

  if (START_WORKFLOW_RE.test(text)) {
    return { kind: "start_workflow", workflowKey: "vehicle-inspection-booking" };
  }

  return null;
}
