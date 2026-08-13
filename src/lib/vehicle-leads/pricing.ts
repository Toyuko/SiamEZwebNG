import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type VehiclePricingMode = "fixed" | "percent" | "hybrid";

export type VehicleServicePricing = {
  sourcingFeeBaht: number;
  sellingFeeBaht: number;
  commissionPercent: number;
  registrationFeeBaht: number;
  deliveryFeeBaht: number;
  inspectionFeeBaht: number;
  otherFeeBaht: number;
  pricingMode: VehiclePricingMode;
  /** When null, customer confirmation must not promise a specific response time. */
  expectedResponseHours: number | null;
  responseTimeframeCopy: string | null;
};

const SETTINGS_KEY = "vehicle_service_pricing";

export function getDefaultVehicleServicePricing(): VehicleServicePricing {
  return {
    sourcingFeeBaht: 5000,
    sellingFeeBaht: 5000,
    commissionPercent: 0,
    registrationFeeBaht: 0,
    deliveryFeeBaht: 0,
    inspectionFeeBaht: 0,
    otherFeeBaht: 0,
    pricingMode: "fixed",
    expectedResponseHours: null,
    responseTimeframeCopy: null,
  };
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
}

function asMode(v: unknown, fallback: VehiclePricingMode): VehiclePricingMode {
  return v === "fixed" || v === "percent" || v === "hybrid" ? v : fallback;
}

export async function getVehicleServicePricing(): Promise<VehicleServicePricing> {
  const defaults = getDefaultVehicleServicePricing();
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row || !row.value || typeof row.value !== "object") return defaults;
    const v = row.value as Record<string, unknown>;
    return {
      sourcingFeeBaht: asNumber(v.sourcingFeeBaht, defaults.sourcingFeeBaht),
      sellingFeeBaht: asNumber(v.sellingFeeBaht, defaults.sellingFeeBaht),
      commissionPercent: asNumber(v.commissionPercent, defaults.commissionPercent),
      registrationFeeBaht: asNumber(v.registrationFeeBaht, defaults.registrationFeeBaht),
      deliveryFeeBaht: asNumber(v.deliveryFeeBaht, defaults.deliveryFeeBaht),
      inspectionFeeBaht: asNumber(v.inspectionFeeBaht, defaults.inspectionFeeBaht),
      otherFeeBaht: asNumber(v.otherFeeBaht, defaults.otherFeeBaht),
      pricingMode: asMode(v.pricingMode, defaults.pricingMode),
      expectedResponseHours:
        typeof v.expectedResponseHours === "number" && v.expectedResponseHours > 0
          ? v.expectedResponseHours
          : null,
      responseTimeframeCopy:
        typeof v.responseTimeframeCopy === "string" && v.responseTimeframeCopy.trim()
          ? v.responseTimeframeCopy.trim()
          : null,
    };
  } catch {
    return defaults;
  }
}

export async function saveVehicleServicePricing(input: VehicleServicePricing): Promise<void> {
  const value = input as unknown as Prisma.InputJsonValue;
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
}

export function computeVehicleServiceFee(input: {
  type: "sell" | "buy";
  vehiclePriceBaht: number | null;
  pricing: VehicleServicePricing;
  extras?: {
    registration?: boolean;
    delivery?: boolean;
    inspection?: boolean;
  };
}): { baseFee: number; commission: number; extras: number; total: number; mode: VehiclePricingMode } {
  const baseFee = input.type === "buy" ? input.pricing.sourcingFeeBaht : input.pricing.sellingFeeBaht;
  const price = input.vehiclePriceBaht ?? 0;
  const commission =
    input.pricing.pricingMode === "fixed"
      ? 0
      : Math.round((price * input.pricing.commissionPercent) / 100);
  const extras =
    (input.extras?.registration ? input.pricing.registrationFeeBaht : 0) +
    (input.extras?.delivery ? input.pricing.deliveryFeeBaht : 0) +
    (input.extras?.inspection ? input.pricing.inspectionFeeBaht : 0) +
    input.pricing.otherFeeBaht;
  const total =
    input.pricing.pricingMode === "percent" ? commission + extras : baseFee + commission + extras;
  return { baseFee, commission, extras, total, mode: input.pricing.pricingMode };
}
