import { generatePromptPayQRPayload } from "@/lib/payments/qr";
import { paymentConfig } from "@/config/payments";
import QRCode from "qrcode";

interface InvoiceQRCodeProps {
  amountCents: number;
  reference: string;
  size?: number;
  className?: string;
}

export async function InvoiceQRCode({
  amountCents,
  reference,
  size = 256,
  className,
}: InvoiceQRCodeProps) {
  const payload = generatePromptPayQRPayload(
    amountCents,
    reference,
    paymentConfig.promptPayId
  );
  const dataUrl = await QRCode.toDataURL(payload, {
    width: size,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return (
    <img
      src={dataUrl}
      alt="PromptPay QR Code"
      width={size}
      height={size}
      className={className}
    />
  );
}
