"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  caseNumber: string;
  serviceName: string;
  locale: string;
}

function PaymentForm({
  clientSecret,
  amount,
  currency,
  caseNumber,
  serviceName,
  locale,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success`,
          payment_method_data: {
            billing_details: {
              // caseNumber passed via server-side PaymentIntent metadata
            },
          },
        },
      });
      if (submitError) {
        setError(submitError.message ?? "Payment failed");
        setLoading(false);
        return;
      }
      router.push("/checkout/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      router.push("/checkout/failure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Payment details</h2>
          <p className="text-sm text-muted">
            Case {caseNumber} · {serviceName}
          </p>
          <p className="text-xl font-bold text-siam-blue">
            {formatCurrency(amount, currency)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentElement
            options={{
              layout: "tabs",
            }}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button type="submit" disabled={!stripe || loading} className="w-full">
            {loading ? "Processing…" : `Pay ${formatCurrency(amount, currency)}`}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

export function CheckoutForm(props: CheckoutFormProps) {
  const options = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#2C54C6",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm {...props} />
    </Elements>
  );
}
