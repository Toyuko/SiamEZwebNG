import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import * as invoiceDA from "@/data-access/invoice";
import * as paymentDA from "@/data-access/payment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    console.error("Stripe webhook secret or secret key not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const caseId = pi.metadata?.caseId;
        const invoiceId = pi.metadata?.invoiceId;

        if (!pi.id) break;

        const payment = await paymentDA.getPaymentByStripePaymentIntentId(pi.id);
        if (payment) {
          await paymentDA.updatePaymentByStripeIntentId(pi.id, {
            status: "succeeded",
            stripeChargeId: typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id,
          });
        }

        if (invoiceId) {
          await invoiceDA.updateInvoicePaid(invoiceId);
        }

        if (caseId) {
          await prisma.case.update({
            where: { id: caseId },
            data: { status: "paid" },
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (!pi.id) break;

        const payment = await paymentDA.getPaymentByStripePaymentIntentId(pi.id);
        if (payment) {
          await paymentDA.updatePaymentByStripeIntentId(pi.id, { status: "failed" });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
