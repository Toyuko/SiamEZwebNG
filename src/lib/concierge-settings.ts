import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { site } from "@/config/site";

export interface ConciergeSettings {
  enabled: boolean;
  fallbackMessageEn: string;
  fallbackMessageTh: string;
  contactHintEn: string;
  contactHintTh: string;
  /** Short FAQ lines the assistant may cite (one per line). */
  faqEn: string;
  faqTh: string;
  /** Extra verified knowledge snippets (hours, payment notes, etc.). */
  knowledgeEn: string;
  knowledgeTh: string;
}

const SETTINGS_KEY = "concierge_settings";

export function getDefaultConciergeSettings(): ConciergeSettings {
  return {
    enabled: true,
    fallbackMessageEn:
      "I'm not certain about that. Let me connect you with SiamEZ so we can confirm it for you.",
    fallbackMessageTh:
      "ฉันยังไม่แน่ใจในข้อมูลนี้ ขอให้ทีม SiamEZ ช่วยยืนยันให้คุณนะคะ/ครับ",
    contactHintEn: `Contact SiamEZ: ${site.phone} · LINE ${site.line} · ${site.email}`,
    contactHintTh: `ติดต่อ SiamEZ: ${site.phone} · LINE ${site.line} · ${site.email}`,
    faqEn: [
      "How do I book a service? Browse Services, choose a service, then Book Now.",
      "What payment methods do you accept? PromptPay QR, bank transfer, and Wise (when configured).",
      "Can I ask about cars or real estate? Yes — Ask SiamEZ can search published listings.",
    ].join("\n"),
    faqTh: [
      "จองบริการอย่างไร? ไปที่บริการ เลือกบริการ แล้วกดจองเลย",
      "ชำระเงินอย่างไร? PromptPay QR โอนธนาคาร และ Wise (ถ้าเปิดใช้)",
      "ถามเรื่องรถหรืออสังหาได้ไหม? ได้ — Ask SiamEZ ค้นหาจากประกาศที่เผยแพร่จริงเท่านั้น",
    ].join("\n"),
    knowledgeEn: [
      `Business hours: Mon–Fri 09:00–18:00 (Thailand time)`,
      `Office: ${site.address.full}`,
      `LINE: ${site.lineUrl}`,
    ].join("\n"),
    knowledgeTh: [
      `เวลาทำการ: จันทร์–ศุกร์ 09:00–18:00 (เวลาประเทศไทย)`,
      `สำนักงาน: ${site.address.full}`,
      `LINE: ${site.lineUrl}`,
    ].join("\n"),
  };
}

function asString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

export async function getConciergeSettings(): Promise<ConciergeSettings> {
  const defaults = getDefaultConciergeSettings();
  const appSettingDelegate = (prisma as unknown as { appSetting?: { findUnique: Function } })
    .appSetting;
  if (!appSettingDelegate?.findUnique) return defaults;

  try {
    const row = await appSettingDelegate.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row || !row.value || typeof row.value !== "object") return defaults;
    const v = row.value as Record<string, unknown>;
    return {
      enabled: asBool(v.enabled, defaults.enabled),
      fallbackMessageEn: asString(v.fallbackMessageEn, defaults.fallbackMessageEn),
      fallbackMessageTh: asString(v.fallbackMessageTh, defaults.fallbackMessageTh),
      contactHintEn: asString(v.contactHintEn, defaults.contactHintEn),
      contactHintTh: asString(v.contactHintTh, defaults.contactHintTh),
      faqEn: asString(v.faqEn, defaults.faqEn),
      faqTh: asString(v.faqTh, defaults.faqTh),
      knowledgeEn: asString(v.knowledgeEn, defaults.knowledgeEn),
      knowledgeTh: asString(v.knowledgeTh, defaults.knowledgeTh),
    };
  } catch {
    return defaults;
  }
}

export async function saveConciergeSettings(input: ConciergeSettings) {
  const value = input as unknown as Prisma.InputJsonValue;
  const appSettingDelegate = (prisma as unknown as { appSetting?: { upsert: Function } }).appSetting;
  if (!appSettingDelegate?.upsert) {
    throw new Error(
      "Concierge settings storage is not available. Please regenerate Prisma client and restart."
    );
  }
  await appSettingDelegate.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
}

export async function isConciergeEnabled(): Promise<boolean> {
  const settings = await getConciergeSettings();
  return settings.enabled;
}
