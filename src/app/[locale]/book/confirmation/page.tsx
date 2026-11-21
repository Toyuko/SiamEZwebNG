import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, MapPin, MessageCircle } from "lucide-react";
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

  const nextSteps = isOfficeCash
    ? [
        "Bring cash for your deposit on appointment day",
        "Bring your case number and required documents",
        "Our team confirms the remaining steps at the office",
      ]
    : [
        "Our team reviews your booking",
        "We verify payment and documents",
        "We confirm your appointment and contact you if anything is missing",
      ];

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#EEF5FF_0%,#FFFFFF_45%)]">
      <div className="mx-auto flex max-w-lg flex-col px-4 py-12 sm:py-16">
        <div className="rounded-3xl border border-[#DCE6F5] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16A34A]/15">
            <CheckCircle2 className="h-8 w-8 text-[#16A34A]" aria-hidden />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-siam-ink sm:text-3xl">
            Your booking has been received!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            {isOfficeCash
              ? "Your appointment preference is saved. Pay your deposit in cash at our Bangkok office."
              : "Thank you — we have your request and will follow up shortly."}
          </p>

          <div className="mt-6 grid gap-3 rounded-2xl bg-siam-surface/70 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#64748B]">Booking number</span>
              <span className="font-bold text-siam-ink">{caseNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#64748B]">Status</span>
              <span className="font-semibold text-siam-ink">
                {isOfficeCash ? "Appointment booked" : "Pending review"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#64748B]">Payment</span>
              <span className="font-semibold text-siam-ink">
                {isOfficeCash ? "Pay at office" : "Under verification"}
              </span>
            </div>
            {formattedAppointment ? (
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Preferred date</span>
                <span className="text-right font-semibold text-siam-ink">
                  {formattedAppointment}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-siam-ink">What happens next</h2>
            <ol className="mt-3 space-y-2">
              {nextSteps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-[#64748B]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-siam-blue text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-siam-ink">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {isOfficeCash ? (
            <div className="mt-6 rounded-2xl border border-siam-yellow/40 bg-siam-yellow/10 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-siam-navy" aria-hidden />
                <div className="space-y-2 text-sm text-siam-ink">
                  <p className="font-semibold">Pay deposit in cash at</p>
                  <p>{site.address.full}</p>
                  <p>
                    Phone:{" "}
                    <a
                      href={`tel:${site.phone.replace(/\s/g, "")}`}
                      className="font-medium text-siam-blue underline"
                    >
                      {site.phone}
                    </a>
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Office hours: Monday–Friday, 9:00 AM – 5:00 PM.
                  </p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-medium text-siam-blue underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          {isGuest ? (
            <div className="mt-6 rounded-2xl border border-siam-blue/20 bg-siam-blue/5 p-4">
              <p className="text-sm font-semibold text-siam-ink">
                Create an account to track this booking
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Upload documents, see invoices, and manage your case in one place.
              </p>
              <Button asChild className="mt-3 w-full" variant="primary">
                <Link
                  href={`/${locale}/register${prefillEmail ? `?email=${encodeURIComponent(prefillEmail)}` : ""}`}
                >
                  Create account
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            {!isGuest ? (
              <Button asChild variant="primary" size="lg" className="w-full">
                <Link href="/portal">View my booking</Link>
              </Button>
            ) : null}
            <Button asChild variant={isGuest ? "primary" : "outline"} size="lg" className="w-full">
              <Link href="/">Back to SiamEZ</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <a href={`mailto:${site.email}`}>
                <MessageCircle className="h-4 w-4" aria-hidden />
                Chat with SiamEZ
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
