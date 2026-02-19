import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PaymentFailurePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment_intent?: string; redirect_status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { redirect_status } = await searchParams;

  return (
    <div className="container mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16">
      <XCircle className="h-16 w-16 text-red-500" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
        Payment failed
      </h1>
      <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
        {redirect_status === "failed"
          ? "Your payment could not be processed. Please try again or use a different payment method."
          : "Something went wrong with your payment. Please try again."}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/portal">Go to portal</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
