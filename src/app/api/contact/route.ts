import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { isEmailConfigured, sendContactFormEmails } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  service: z.string().trim().min(1).max(80),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit(
      clientKeyFromRequest(request, "contact"),
      8,
      60_000
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec);
    }

    const json = await request.json();
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid form data." },
        { status: 400 }
      );
    }

    const data = {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      service: parsed.data.service,
      message: parsed.data.message || undefined,
    };

    if (!isEmailConfigured() && !process.env.CONTACT_FORM_WEBHOOK_URL?.trim()) {
      console.warn(
        "[contact-form] Neither RESEND_API_KEY nor CONTACT_FORM_WEBHOOK_URL is configured."
      );
      return NextResponse.json(
        { success: false, error: "Unable to submit your request right now." },
        { status: 503 }
      );
    }

    const result = await sendContactFormEmails(data);
    const webhookOk = Boolean(process.env.CONTACT_FORM_WEBHOOK_URL?.trim());

    if (result.ok || (result.ok === false && result.skipped && webhookOk)) {
      return NextResponse.json({ success: true });
    }

    if (result.ok === false && result.skipped) {
      return NextResponse.json(
        { success: false, error: "Unable to submit your request right now." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unable to submit your request right now." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
