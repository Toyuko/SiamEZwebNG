import type { SubmitVehicleLeadInput } from "@/lib/vehicle-leads/schema";

export function blankToNull(value: string | undefined | null): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export function resolveMake(make: string | undefined, makeOther: string | undefined): string | null {
  if (!make?.trim()) return blankToNull(makeOther);
  if (make.trim().toLowerCase() === "other") return blankToNull(makeOther) ?? "Other";
  return make.trim();
}

export function buildDisplayTitle(input: SubmitVehicleLeadInput): string {
  const make = resolveMake(input.vehicle.make, input.vehicle.makeOther);
  const model = blankToNull(input.vehicle.model);
  if (input.type === "sell") {
    const year = "year" in input.vehicle ? input.vehicle.year : undefined;
    return [make, model, year].filter(Boolean).join(" ") || "Vehicle";
  }
  const parts = [make, model].filter(Boolean);
  return parts.length ? parts.join(" ") : input.vehicle.kind === "motorcycle" ? "Motorcycle search" : "Vehicle search";
}

export function formatThb(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function leadHeadline(input: {
  type: "sell" | "buy";
  displayTitle: string;
  province?: string | null;
  askingPrice?: number | null;
  budgetMax?: number | null;
}): string {
  const kind = input.type === "sell" ? "SELL VEHICLE" : "FIND VEHICLE";
  const location = input.province?.trim() || "Thailand";
  const price =
    input.type === "sell"
      ? formatThb(input.askingPrice)
      : input.budgetMax != null
        ? `up to ${formatThb(input.budgetMax)}`
        : "budget TBD";
  return `${kind} — ${input.displayTitle} — ${location} — ${price}`;
}
