/**
 * A/B-test-ready payment copy. UI must look up i18n keys from these variants
 * instead of hardcoding "deposit" vs "secure booking" strings.
 */

export type PaymentCtaVariant = "secure_booking" | "start_service";
export type PaymentLabelVariant = "initial_payment" | "deposit";

export interface PaymentExperimentConfig {
  ctaVariant: PaymentCtaVariant;
  labelVariant: PaymentLabelVariant;
  /** Override catalog minimum (THB) for experiments such as 500 vs 1000. */
  minimumThbOverride?: number;
}

export function getPaymentExperimentConfig(): PaymentExperimentConfig {
  const cta =
    process.env.NEXT_PUBLIC_PAYMENT_CTA_VARIANT === "start_service"
      ? "start_service"
      : "secure_booking";
  const label =
    process.env.NEXT_PUBLIC_PAYMENT_LABEL_VARIANT === "deposit"
      ? "deposit"
      : "initial_payment";
  const minRaw = process.env.PAYMENT_MINIMUM_THB?.trim();
  const min = minRaw ? Number(minRaw) : undefined;
  return {
    ctaVariant: cta,
    labelVariant: label,
    minimumThbOverride:
      min != null && Number.isFinite(min) && min > 0 ? Math.round(min) : undefined,
  };
}

export function paymentCopyKeys(config: PaymentExperimentConfig = getPaymentExperimentConfig()) {
  return {
    primaryCta:
      config.ctaVariant === "start_service" ? "ctaStartService" : "ctaSecureBooking",
    amountLabel:
      config.labelVariant === "deposit" ? "depositLabel" : "payToday",
    whyLow:
      config.ctaVariant === "start_service" ? "whyStartService" : "whySecureBooking",
  } as const;
}
