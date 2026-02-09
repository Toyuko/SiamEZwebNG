import Stripe from "stripe";

export const stripe =
  typeof process.env.STRIPE_SECRET_KEY === "string" && process.env.STRIPE_SECRET_KEY.length > 0
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
    : (null as unknown as Stripe);

export function getStripe(): Stripe {
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set");
  return stripe;
}
