import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckCircle, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";
import { officeGoogleMapsUrl } from "@/lib/maps";

function formatAppointmentDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    caseNumber?: string;
    guest?: string;
    email?: string;
    payAtOffice?: string;
    appointmentDate?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { caseNumber, guest, email, payAtOffice, appointmentDate } = await searchParams;
  if (!caseNumber?.trim()) {
    notFound();
  }
  const isGuest = guest === "1";
  const prefillEmail = email ?? "";
  const isOfficeCash = payAtOffice === "1";
  const formattedAppointment = appointmentDate
    ? formatAppointmentDate(appointmentDate)
    : null;
  const mapsUrl = officeGoogleMapsUrl();

  return (
    <div className="container mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16">
      <CheckCircle className="h-16 w-16 text-green-500 dark:text-green-400" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
        {isOfficeCash ? "Appointment booked" : "Pending Review"}
      </h1>
      <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
        {isOfficeCash ? (
          <>
            Your booking is confirmed. Case number <strong>{caseNumber}</strong>. Please bring
            cash for your deposit when you visit our office
            {formattedAppointment ? (
              <>
                {" "}
                on <strong>{formattedAppointment}</strong>
              </>
            ) : null}
            .
          </>
        ) : (
          <>
            Thank you for your request. Your case is under review and we will send you a quote
            within 24–48 hours. Your case number is <strong>{caseNumber}</strong>. Please keep it
            for your records.
          </>
        )}
      </p>

      {isOfficeCash ? (
        <div className="mt-6 w-full rounded-lg border border-siam-gold/40 bg-siam-gold/10 p-4 text-left">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-siam-gold" aria-hidden />
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-white">Pay deposit in cash at:</p>
              <p>{site.address.full}</p>
              <p>
                Phone:{" "}
                <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="text-siam-blue underline">
                  {site.phone}
                </a>
              </p>
              <p className="text-muted">
                Office hours: Monday–Friday, 9:00 AM – 5:00 PM. Please arrive on time for your
                appointment and bring your case number.
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-siam-blue underline"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {isGuest && (
        <div className="mt-6 w-full rounded-lg border border-siam-blue/30 bg-siam-blue/5 p-4 dark:border-siam-blue/50 dark:bg-siam-blue/10">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Create your account to track this case
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Upload documents, see invoices, and manage your case in one place.
          </p>
          <Button asChild className="mt-3 w-full" variant="default">
            <Link
              href={`/${locale}/register${prefillEmail ? `?email=${encodeURIComponent(prefillEmail)}` : ""}`}
            >
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
