import { sendSalesBoostPendingEmail } from "@/lib/email/messages";

/** Fire-and-forget admin ping when a bank-transfer boost slip is submitted. */
export async function notifyAdminSalesBoostPending(input: {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  boostTier: string;
  priceThb: number;
}): Promise<void> {
  sendSalesBoostPendingEmail(input);
}
