import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOmiseWebhookSignature, parseOmiseChargeCompleteEvent } from "@/lib/omise";
import { applySalesBoostAfterPayment } from "@/data-access/sales";
import { boostDaysFromTier } from "@/lib/sales-boost-packages";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-omise-signature");

  if (!verifyOmiseWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseOmiseChargeCompleteEvent(payload);
  if (!parsed || !parsed.paid) {
    return NextResponse.json({ received: true });
  }

  if (parsed.metadata.type !== "sales_boost") {
    return NextResponse.json({ received: true });
  }

  const vehicleId = parsed.metadata.sales_vehicle_id;
  if (!vehicleId) {
    return NextResponse.json({ received: true });
  }

  const tier = parsed.metadata.boost_tier ?? null;
  const daysRaw = Number.parseInt(parsed.metadata.boost_days ?? "", 10);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : boostDaysFromTier(tier);

  try {
    const vehicle = await prisma.salesVehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, omiseChargeId: true },
    });
    if (!vehicle) {
      return NextResponse.json({ received: true });
    }
    if (vehicle.omiseChargeId && vehicle.omiseChargeId !== parsed.chargeId) {
      console.warn("[omise-webhook] omise_charge_id mismatch for vehicle", vehicleId);
      return NextResponse.json({ received: true });
    }

    await applySalesBoostAfterPayment(vehicleId, {
      days,
      tier,
      clearOmiseCharge: true,
    });
  } catch (e) {
    console.error("[omise-webhook] boost fulfillment failed:", e);
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
