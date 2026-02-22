/**
 * PromptPay / Thai QR code payload generator.
 * Uses promptpay-qr for EMV format, qrcode for image rendering.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generatePayload } = require("promptpay-qr");

const defaultPromptPayId =
  typeof process !== "undefined" ? process.env.PROMPTPAY_ID ?? "0812345678" : "0812345678";

/**
 * Generate PromptPay QR payload for dynamic amount (THB).
 * @param amountCents Amount in smallest unit (satang/cents)
 * @param promptPayId PromptPay ID (mobile 0XXXXXXXXX, tax ID, or e-wallet)
 */
export function generatePromptPayQRPayload(
  amountCents: number,
  _reference?: string,
  promptPayId?: string
): string {
  const id = promptPayId ?? defaultPromptPayId;
  const amountBaht = amountCents / 100;
  return generatePayload(id, { amount: amountBaht });
}
