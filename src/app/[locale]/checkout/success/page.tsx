import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment_intent?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
        Payment successful
      </h1>
      <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
        Thank you for your payment. We have received your payment and will process your request shortly.
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
