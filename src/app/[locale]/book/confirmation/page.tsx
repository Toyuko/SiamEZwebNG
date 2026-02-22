import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ caseNumber?: string; guest?: string; email?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { caseNumber, guest, email } = await searchParams;
  const isGuest = guest === "1";
  const prefillEmail = email ?? "";

  return (
    <div className="container mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16">
      <CheckCircle className="h-16 w-16 text-green-500 dark:text-green-400" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
        Pending Review
      </h1>
      <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
        Thank you for your request. Your case is under review and we will send you
        a quote within 24–48 hours.
        {caseNumber && (
          <>
            {" "}
            Your case number is <strong>{caseNumber}</strong>. Please keep it for
            your records.
          </>
        )}
      </p>

      {isGuest && (
        <div className="mt-6 w-full rounded-lg border border-siam-blue/30 bg-siam-blue/5 p-4 dark:border-siam-blue/50 dark:bg-siam-blue/10">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Create your account to track this case
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Upload documents, see invoices, and manage your case in one place.
          </p>
          <Button asChild className="mt-3 w-full" variant="default">
            <Link href={`/${locale}/register${prefillEmail ? `?email=${encodeURIComponent(prefillEmail)}` : ""}`}>
              Create account
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        {!isGuest && (
          <Button asChild variant="outline">
            <Link href="/portal">Go to portal</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
