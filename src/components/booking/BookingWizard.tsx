"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { submitBooking } from "@/actions/booking";
import { clientDetailsSchema } from "@/lib/booking-schema";
import type { ServiceSlug } from "@/config/services";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Upload, FileText, X } from "lucide-react";

const STEPS = [
  { id: "summary", label: "Service summary" },
  { id: "details", label: "Client details" },
  { id: "documents", label: "Document upload" },
  { id: "review", label: "Review & submit" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface DocumentMeta {
  name: string;
  size?: number;
  mimeType?: string;
  documentType?: string;
}

interface BookingWizardProps {
  service: Service;
  serviceSlug: string;
  /** Logged-in user – optional; if absent, guest checkout */
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

const EVENT_VENUE_SLUG = "event-planning-venue-services" satisfies ServiceSlug;

export function BookingWizard({ service, serviceSlug, userId, userEmail, userName }: BookingWizardProps) {
  const router = useRouter();
  const tEventVenue = useTranslations("booking.eventVenue");
  const isEventVenueBooking = serviceSlug === EVENT_VENUE_SLUG;
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentStepId = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 1;

  useEffect(() => {
    if (userEmail || userName) {
      setFormData((p) => ({
        ...p,
        ...(userEmail && { email: userEmail }),
        ...(userName && { name: userName }),
      }));
    }
  }, [userEmail, userName]);

  const validateClientDetails = (): boolean => {
    const result = clientDetailsSchema.safeParse({
      name: formData.name ?? "",
      email: formData.email ?? "",
      phone: formData.phone ?? "",
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([k, v]) => {
        if (v?.[0]) errs[k] = v[0];
      });
      setFieldErrors(errs);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStepId === "details" && !validateClientDetails()) return;
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    setError(null);
    setFieldErrors({});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setDocuments((prev) => [
        ...prev,
        {
          name: f.name,
          size: f.size,
          mimeType: f.type,
          documentType: undefined,
        },
      ]);
    }
    e.target.value = "";
  };

  const removeDocument = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const isGuest = !userId;

  async function handleSubmit() {
    if (currentStepId === "details" && !validateClientDetails()) return;

    setLoading(true);
    setError(null);
    const payload = {
      ...formData,
      documents: documents.map((d) => ({ name: d.name, size: d.size, mimeType: d.mimeType, documentType: d.documentType })),
    };
    const result = await submitBooking({
      serviceId: service.id,
      serviceSlug,
      isGuest,
      userId: userId ?? undefined,
      guestEmail: (formData.email as string) || userEmail || undefined,
      guestName: (formData.name as string) || userName || undefined,
      guestPhone: (formData.phone as string) || undefined,
      formData: payload,
      documentIds: undefined,
    });
    setLoading(false);

    if (result.success && result.caseId && result.caseNumber) {
      if (result.isFixed) {
        const base = `/checkout/${result.caseId}`;
        const url = isGuest && result.guestCheckoutToken
          ? `${base}?token=${encodeURIComponent(result.guestCheckoutToken)}`
          : base;
        router.push(url);
      } else {
        const params = new URLSearchParams();
        params.set("caseNumber", result.caseNumber);
        if (isGuest) {
          params.set("guest", "1");
          params.set("email", (formData.email as string) ?? "");
        }
        router.push(`/book/confirmation?${params.toString()}`);
      }
      return;
    }
    setError(result.error ?? "Submission failed.");
  }

  return (
    <Card>
      <CardHeader className="border-b pb-6">
        <Stepper
          steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
          currentIndex={stepIndex}
        />
      </CardHeader>
      <CardContent className="pt-6">
        {currentStepId === "summary" && (
          <ServiceSummaryStep
            service={service}
            isEventVenue={isEventVenueBooking}
            venueNote={isEventVenueBooking ? tEventVenue("summaryNote") : undefined}
          />
        )}
        {currentStepId === "details" && (
          <ClientDetailsStep
            formData={formData}
            setFormData={setFormData}
            fieldErrors={fieldErrors}
            isLoggedIn={!!userId}
            serviceSlug={serviceSlug}
            isEventVenue={isEventVenueBooking}
            tEventVenue={tEventVenue}
          />
        )}
        {currentStepId === "documents" && (
          <DocumentUploadStep
            documents={documents}
            onFileChange={handleFileChange}
            onRemove={removeDocument}
            extraHint={isEventVenueBooking ? tEventVenue("documentsHint") : undefined}
          />
        )}
        {currentStepId === "review" && (
          <ReviewStep
            service={service}
            formData={formData}
            documents={documents}
            isEventVenue={isEventVenueBooking}
            tEventVenue={tEventVenue}
          />
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-8 flex flex-col-reverse justify-between gap-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Submitting…" : isLastStep ? "Submit booking" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceSummaryStep({
  service,
  isEventVenue,
  venueNote,
}: {
  service: Service;
  isEventVenue?: boolean;
  venueNote?: string;
}) {
  const priceAmount = service.priceAmount;
  const priceCurrency = service.priceCurrency ?? "THB";
  const isFixed = service.type === "fixed";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Service summary
      </h2>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
        {service.shortDescription && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {service.shortDescription}
          </p>
        )}
        {isEventVenue && venueNote ? (
          <p className="mt-3 border-t border-gray-200 pt-3 text-sm leading-relaxed text-gray-700 dark:border-gray-600 dark:text-gray-300">
            {venueNote}
          </p>
        ) : null}
        <div className="mt-4 flex items-center gap-2">
          {isFixed && priceAmount != null ? (
            <span className="text-lg font-semibold text-siam-blue">
              {formatCurrency(priceAmount, priceCurrency)}
            </span>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Quote-based — we&apos;ll send you a quote after review
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDetailsStep({
  formData,
  setFormData,
  fieldErrors,
  isLoggedIn,
  serviceSlug,
  isEventVenue,
  tEventVenue,
}: {
  formData: Record<string, unknown>;
  setFormData: (d: Record<string, unknown> | ((p: Record<string, unknown>) => Record<string, unknown>)) => void;
  fieldErrors: Record<string, string>;
  isLoggedIn: boolean;
  serviceSlug: string;
  isEventVenue: boolean;
  tEventVenue: ReturnType<typeof useTranslations<"booking.eventVenue">>;
}) {
  const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] ?? "en" : "en";
  const loginHref = `/${locale}/login?redirect=/${locale}/book/${serviceSlug}`;
  const registerHref = `/${locale}/register?redirect=/${locale}/book/${serviceSlug}`;

  const textareaClass =
    "flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Your details
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full name *
          </label>
          <Input
            id="name"
            type="text"
            required
            placeholder="John Doe"
            value={(formData.name as string) ?? ""}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            className={cn(fieldErrors.name && "border-red-500 focus-visible:ring-red-500")}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email *
          </label>
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={(formData.email as string) ?? ""}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className={cn(fieldErrors.email && "border-red-500 focus-visible:ring-red-500")}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone *
          </label>
          <Input
            id="phone"
            type="tel"
            required
            placeholder="+66 00 000 0000"
            value={(formData.phone as string) ?? ""}
            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
            className={cn(fieldErrors.phone && "border-red-500 focus-visible:ring-red-500")}
            aria-invalid={!!fieldErrors.phone}
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.phone}</p>
          )}
        </div>

        {isEventVenue ? (
          <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {tEventVenue("eventDetailsHeading")}
            </h3>
            <div>
              <label
                htmlFor="event-type"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {tEventVenue("eventTypeLabel")}
              </label>
              <select
                id="event-type"
                className={cn(
                  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900",
                )}
                value={(formData.eventType as string) ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, eventType: e.target.value }))}
              >
                <option value="">{tEventVenue("eventTypePlaceholder")}</option>
                <option value="corporate">{tEventVenue("eventTypeCorporate")}</option>
                <option value="private">{tEventVenue("eventTypePrivate")}</option>
                <option value="vip_table">{tEventVenue("eventTypeVip")}</option>
                <option value="other">{tEventVenue("eventTypeOther")}</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="event-date"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {tEventVenue("eventDateLabel")}
                </label>
                <Input
                  id="event-date"
                  type="date"
                  value={(formData.eventDate as string) ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, eventDate: e.target.value }))}
                />
              </div>
              <div>
                <label
                  htmlFor="guest-count"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {tEventVenue("guestCountLabel")}
                </label>
                <Input
                  id="guest-count"
                  type="text"
                  inputMode="numeric"
                  placeholder={tEventVenue("guestCountPlaceholder")}
                  value={(formData.guestCount as string) ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, guestCount: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="venue-notes"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {tEventVenue("venueNotesLabel")}
              </label>
              <textarea
                id="venue-notes"
                rows={4}
                placeholder={tEventVenue("venueNotesPlaceholder")}
                value={(formData.venueNotes as string) ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, venueNotes: e.target.value }))}
                className={textareaClass}
              />
            </div>
          </div>
        ) : null}

        {!isLoggedIn && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Want to track your case? Create an account
            </p>
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
              Continue as guest below, or create an account to track your case, upload documents, and see invoices.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={loginHref}
                className="text-sm font-medium text-siam-blue hover:underline"
              >
                Already have an account? Log in
              </a>
              <span className="text-gray-400">·</span>
              <a
                href={registerHref}
                className="text-sm font-medium text-siam-blue hover:underline"
              >
                Create an account
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentUploadStep({
  documents,
  onFileChange,
  onRemove,
  extraHint,
}: {
  documents: DocumentMeta[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
  extraHint?: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Document upload
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Upload required documents. Metadata is saved now; file storage will be added later.
      </p>
      {extraHint ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{extraHint}</p>
      ) : null}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition-colors hover:border-siam-blue hover:bg-siam-blue/5 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-siam-blue dark:hover:bg-siam-blue/10">
        <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Click to upload or drag and drop
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          PDF, JPG, PNG up to 10MB
        </span>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onFileChange}
          className="hidden"
        />
      </label>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {doc.name}
                  </p>
                  {doc.size != null && (
                    <p className="text-xs text-gray-500">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function eventTypeLabel(
  t: ReturnType<typeof useTranslations<"booking.eventVenue">>,
  value: string,
): string {
  switch (value) {
    case "corporate":
      return t("eventTypeCorporate");
    case "private":
      return t("eventTypePrivate");
    case "vip_table":
      return t("eventTypeVip");
    case "other":
      return t("eventTypeOther");
    default:
      return value || "—";
  }
}

function ReviewStep({
  service,
  formData,
  documents,
  isEventVenue,
  tEventVenue,
}: {
  service: Service;
  formData: Record<string, unknown>;
  documents: DocumentMeta[];
  isEventVenue: boolean;
  tEventVenue: ReturnType<typeof useTranslations<"booking.eventVenue">>;
}) {
  const isFixed = service.type === "fixed";
  const priceAmount = service.priceAmount;
  const priceCurrency = service.priceCurrency ?? "THB";

  const eventType = (formData.eventType as string) || "";
  const eventDate = (formData.eventDate as string) || "";
  const guestCount = (formData.guestCount as string) || "";
  const venueNotes = (formData.venueNotes as string) || "";
  const hasEventBrief =
    isEventVenue && (eventType || eventDate || guestCount || venueNotes);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Review & submit
      </h2>

      <div className="space-y-4">
        {hasEventBrief ? (
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {tEventVenue("reviewEventHeading")}
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-gray-800 dark:text-gray-200">
              {eventType ? (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{tEventVenue("reviewEventType")}</dt>
                  <dd>{eventTypeLabel(tEventVenue, eventType)}</dd>
                </div>
              ) : null}
              {eventDate ? (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{tEventVenue("reviewEventDate")}</dt>
                  <dd>{eventDate}</dd>
                </div>
              ) : null}
              {guestCount ? (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{tEventVenue("reviewGuestCount")}</dt>
                  <dd>{guestCount}</dd>
                </div>
              ) : null}
              {venueNotes ? (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{tEventVenue("reviewVenueNotes")}</dt>
                  <dd className="whitespace-pre-wrap">{venueNotes}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Service
          </h3>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {service.name}
          </p>
          {isFixed && priceAmount != null && (
            <p className="mt-1 text-siam-blue">
              {formatCurrency(priceAmount, priceCurrency)}
            </p>
          )}
          {!isFixed && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Quote-based — pending review
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Contact details
          </h3>
          <p className="mt-1 text-gray-900 dark:text-white">{String(formData.name ?? "")}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {String(formData.email ?? "")}
          </p>
          {formData.phone ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {String(formData.phone)}
            </p>
          ) : null}
        </div>

        {documents.length > 0 && (
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Documents ({documents.length})
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {documents.map((d, i) => (
                <li key={i}>{d.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!isFixed && (
        <p className="rounded-lg bg-siam-blue/10 p-4 text-sm text-gray-700 dark:text-gray-300">
          We will review your request and send you a quote within 24–48 hours at{" "}
          <strong>{String(formData.email)}</strong>.
        </p>
      )}
    </div>
  );
}
