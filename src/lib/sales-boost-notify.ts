/** Fire-and-forget admin ping when a bank-transfer boost slip is submitted. */
export async function notifyAdminSalesBoostPending(input: {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  boostTier: string;
  priceThb: number;
}): Promise<void> {
  const url = process.env.CONTACT_FORM_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[sales-boost] CONTACT_FORM_WEBHOOK_URL not set; admin webhook skipped.");
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "sales-boost-pending-bank-transfer",
        receivedAt: new Date().toISOString(),
        ...input,
      }),
    });
  } catch (e) {
    console.warn("[sales-boost] admin notify failed:", e);
  }
}
