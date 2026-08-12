/**
 * Concierge answers about a stored quote. Never invents amounts.
 */

import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { parseStoredPaymentPlan } from "@/lib/payments/quote-plan";
import type { ConciergeLocale, ConciergeReply } from "@/lib/ai/types";

const PAYMENT_QUESTION_RE =
  /\b(why\s+(do\s+i\s+only\s+have\s+to\s+pay|is\s+my\s+payment)|can\s+i\s+pay\s+the\s+rest\s+later|what\s+is\s+included|how\s+much\s+do\s+i\s+owe|are\s+government\s+fees\s+included|when\s+is\s+my\s+next\s+payment|deposit|initial\s+payment|remaining|pay\s+today|10%|20%|30%)\b|(?:ทำไม|จ่าย|ยอด|เหลือ|มัดจำ|ค่าธรรมเนียม)/i;

export function isQuotePaymentQuestion(message: string): boolean {
  return PAYMENT_QUESTION_RE.test(message.trim());
}

export async function buildStoredQuotePaymentReply(input: {
  userId?: string | null;
  locale: ConciergeLocale;
}): Promise<ConciergeReply | null> {
  if (!input.userId) return null;

  const quote = await prisma.quote.findFirst({
    where: { userId: input.userId },
    include: { service: { select: { name: true } }, paymentMilestones: true },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) return null;

  const plan = parseStoredPaymentPlan(quote.paymentPlan);
  const total = formatCurrency(quote.amount, quote.currency);
  const initial = formatCurrency(
    quote.initialPaymentTotal ?? plan?.initial_payment_total ?? quote.amount,
    quote.currency
  );
  const remaining = formatCurrency(
    quote.remainingBalance ?? plan?.remaining_balance ?? 0,
    quote.currency
  );
  const pct = quote.initialPercentage ?? plan?.initial_percentage ?? 0;
  const reason = quote.paymentReason ?? plan?.reason ?? "";
  const nextMilestone = quote.paymentMilestones.find((m) => m.status !== "paid");

  const en = `Your total estimated service cost is ${total}. SiamEZ only requires ${initial} to begin (${pct}%${quote.requiredUpfrontCosts ? " plus required upfront costs" : ""}). Your remaining balance is ${remaining} and will be due according to your service payment schedule.${reason ? ` ${reason}` : ""}${nextMilestone ? ` Next payment: ${formatCurrency(nextMilestone.amount, quote.currency)} (${nextMilestone.name}).` : ""} Government and third-party fees are shown separately on your quote — estimated amounts are not guaranteed.`;
  const th = `ค่าบริการโดยประมาณทั้งหมด ${total} SiamEZ เรียกเก็บเพียง ${initial} เพื่อเริ่มงาน (${pct}%) ยอดคงเหลือ ${remaining} จะครบกำหนดตามแผนการชำระ${reason ? ` ${reason}` : ""}${nextMilestone ? ` ยอดถัดไป: ${formatCurrency(nextMilestone.amount, quote.currency)} (${nextMilestone.name})` : ""} ค่าธรรมเนียมราชการและบุคคลที่สามแยกแสดงในใบเสนอราคา — ยอดประมาณการไม่ใช่ยอดยืนยัน`;

  return {
    content: input.locale === "th" ? th : en,
    recommendations: [],
    mode: "rule",
  };
}
