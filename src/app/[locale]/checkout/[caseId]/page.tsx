import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { getCaseByIdForUser, getCaseByIdWithToken } from "@/data-access/case";
import { createPaymentIntent } from "@/actions/payment";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Button } from "@/components/ui/button";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; caseId: string }>;
  searchParams: Promise<{ invoiceId?: string; token?: string }>;
}) {
  const { locale, caseId } = await params;
  const { invoiceId, token } = await searchParams;
  setRequestLocale(locale);
  const session = await getSession();

  let c = null;
  let isGuestCheckout = false;
  if (session?.user?.id) {
    c = await getCaseByIdForUser(caseId, session.user.id);
  }
  if (!c && token && typeof token === "string") {
    c = await getCaseByIdWithToken(caseId, token);
    isGuestCheckout = !!c;
  }
  if (!c) notFound();

  if (c.status === "paid") {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Already paid
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Case {c.caseNumber} has already been paid.
        </p>
        <Button asChild className="mt-6">
          <Link href={isGuestCheckout ? "/" : "/portal"}>{isGuestCheckout ? "Back to home" : "Go to portal"}</Link>
        </Button>
      </div>
    );
  }

  const result = await createPaymentIntent({
    caseId,
    invoiceId: invoiceId ?? undefined,
    guestToken: isGuestCheckout ? token : undefined,
  });
  if (!result.success || !result.clientSecret) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Payment error
        </h1>
        <p className="mt-2 text-red-600 dark:text-red-400">
          {result.error ?? "Unable to start checkout"}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const amount = result.amount ?? 0;
  const currency = result.currency ?? "THB";

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        Complete payment
      </h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Pay for case <strong>{c.caseNumber}</strong> · {c.service.name}
      </p>
      <CheckoutForm
        clientSecret={result.clientSecret}
        amount={amount}
        currency={currency}
        caseNumber={c.caseNumber}
        serviceName={c.service.name}
        locale={locale}
      />
      <div className="mt-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Cancel and return home</Link>
        </Button>
      </div>
    </div>
  );
}
