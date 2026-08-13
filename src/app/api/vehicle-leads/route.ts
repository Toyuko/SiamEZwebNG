import { NextResponse } from "next/server";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { submitVehicleLeadSchema } from "@/lib/vehicle-leads/schema";
import { submitVehicleLead } from "@/lib/vehicle-leads/submit";
import { sendVehicleLeadNotification } from "@/lib/email/messages";
import { leadHeadline } from "@/lib/vehicle-leads/display";

export async function POST(request: Request) {
  const rl = checkRateLimit(clientKeyFromRequest(request, "vehicle-lead"), 6, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const json = await request.json();
    const parsed = submitVehicleLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please check the form and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await submitVehicleLead(parsed.data);
    if (result.duplicate) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        leadNumber: result.leadNumber,
      });
    }

    const lead = result.lead;
    sendVehicleLeadNotification({
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      type: lead.type,
      displayTitle: lead.displayTitle,
      year: lead.vehicle?.year,
      mileageKm: lead.vehicle?.mileageKm,
      province: lead.province,
      askingPrice: lead.askingPrice,
      aiRangeMin: lead.aiEstimatedMin,
      aiRangeMax: lead.aiEstimatedMax,
      leadScore: lead.aiLeadScore,
      customerName: lead.customerName,
      customerEmail: lead.customerEmail,
    });

    return NextResponse.json({
      success: true,
      leadNumber: lead.leadNumber,
      publicToken: lead.publicToken,
      headline: leadHeadline({
        type: lead.type,
        displayTitle: lead.displayTitle,
        province: lead.province,
        askingPrice: lead.askingPrice,
        budgetMax: lead.budgetMax,
      }),
    });
  } catch (error) {
    console.error("[vehicle-leads] submit failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to submit your request right now." },
      { status: 500 }
    );
  }
}
