/** How the customer intends to pay their booking deposit. */
export type DepositPaymentMethod = "online" | "office_cash";

export function parseDepositPaymentMethod(
  formData: Record<string, unknown> | null | undefined
): DepositPaymentMethod {
  if (!formData) return "online";
  const topLevel = formData.depositPaymentMethod;
  if (topLevel === "office_cash") return "office_cash";
  const nested = formData.driverLicense;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const dl = nested as Record<string, unknown>;
    if (dl.depositPaymentMethod === "office_cash") return "office_cash";
  }
  return "online";
}

export function isOfficeCashDeposit(formData: Record<string, unknown> | null | undefined): boolean {
  return parseDepositPaymentMethod(formData) === "office_cash";
}
