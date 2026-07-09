import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api-response";
import { getPublicFreelancerBySlug } from "@/data-access/freelancer";
import { prisma } from "@/lib/db";

const inquirySchema = z.object({
  slug: z.string().trim().min(1).max(48),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = inquirySchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid inquiry data", 400);
    }

    const profile = await getPublicFreelancerBySlug(parsed.data.slug.toLowerCase());
    if (!profile) return fail("Freelancer not found", 404);

    const owner = await prisma.freelancerProfile.findUnique({
      where: { id: profile.id },
      select: {
        user: { select: { email: true, name: true } },
      },
    });

    const payload = {
      type: "freelancer-inquiry",
      freelancerSlug: profile.slug,
      freelancerName: profile.user.name,
      freelancerEmail: owner?.user.email,
      fromName: parsed.data.name,
      fromEmail: parsed.data.email,
      fromPhone: parsed.data.phone || undefined,
      message: parsed.data.message,
      receivedAt: new Date().toISOString(),
    };

    const webhookUrl = process.env.CONTACT_FORM_WEBHOOK_URL;
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return fail("Unable to send your inquiry right now.", 502);
      }
    } else {
      console.info("[freelancer-inquiry]", {
        slug: payload.freelancerSlug,
        fromEmail: payload.fromEmail,
        messageLength: payload.message.length,
      });
    }

    return ok({ sent: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send inquiry";
    return fail(message, 500);
  }
}
