"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { submitBooking } from "@/actions/booking";
import { clientDetailsSchema } from "@/lib/booking-schema";
import {
  computeAddonsTotalThb,
  computeBasePriceThb,
  getMinimumAppointmentDateString,
  isValidDriverLicenseAppointmentDate,
  type LicenseAddons,
  type LicenseServiceCategory,
  type LicenseVehicleType,
} from "@/lib/driver-license-booking";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { FileText, Upload, X } from "lucide-react";

const STEP_IDS = ["service", "addons", "date", "payment"] as const;
type StepId = (typeof STEP_IDS)[number];

interface DocumentMeta {
  name: string;
  size?: number;
  mimeType?: string;
}

interface DriverLicenseBookingWizardProps {
  service: Service;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

function useThbFormatter() {
  const locale = useLocale();
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
}

export function DriverLicenseBookingWizard({
  service,
  userId,
  userEmail,
  userName,
}: DriverLicenseBookingWizardProps) {
  const t = useTranslations("driverLicenseWizard");
  const router = useRouter();
  const fmtThb = useThbFormatter();
  const locale = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [category, setCategory] = useState<LicenseServiceCategory | null>(null);
  const [vehicle, setVehicle] = useState<LicenseVehicleType | null>(null);
  const [addons, setAddons] = useState<LicenseAddons>({
    fastTrack: false,
    translationLetter: false,
    addressCertificate: false,
  });
  const [appointmentDate, setAppointmentDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const minYmd = getMinimumAppointmentDateString();

  useEffect(() => {
    if (userEmail || userName) {
      if (userEmail) setEmail(userEmail);
      if (userName) setName(userName);
    }
  }, [userEmail, userName]);

  const baseThb =
    !category ? 0 : computeBasePriceThb(category, category === "idp" ? null : vehicle);

  const addonsThb = computeAddonsTotalThb(addons);
  const totalThb = baseThb + addonsThb;

  const steps = [
    { id: "service" as const, label: t("stepService") },
    { id: "addons" as const, label: t("stepAddons") },
    { id: "date" as const, label: t("stepDate") },
    { id: "payment" as const, label: t("stepPayment") },
  ];

  const currentStepId = STEP_IDS[stepIndex];
  const isLastStep = stepIndex === STEP_IDS.length - 1;
  const isGuest = !userId;

  const loginHref = `/${locale}/login?redirect=/${locale}/book/driver-license`;
  const registerHref = `/${locale}/register?redirect=/${locale}/book/driver-license`;

  const validateServiceStep = (): boolean => {
    if (!category) {
      setError(t("selectServiceError"));
      return false;
    }
    if (category !== "idp" && !vehicle) {
      setError(t("selectServiceError"));
      return false;
    }
    setError(null);
    return true;
  };

  const validateDateStep = (): boolean => {
    const v = isValidDriverLicenseAppointmentDate(appointmentDate, minYmd);
    if (v === "required") {
      setError(t("dateErrorRequired"));
      return false;
    }
    if (v === "weekend") {
      setError(t("dateErrorWeekend"));
      return false;
    }
    if (v === "too_soon") {
      setError(t("dateErrorTooSoon"));
      return false;
    }
    setError(null);
    return true;
  };

  const validatePaymentStep = (): boolean => {
    const result = clientDetailsSchema.safeParse({ name, email, phone });
    if (!result.success) {
      const errs: Record<string, string> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([k, v]) => {
        if (v?.[0]) errs[k] = v[0];
      });
      setFieldErrors(errs);
      return false;
    }
    if (documents.length < 1) {
      setError(t("receiptRequired"));
      setFieldErrors({});
      return false;
    }
    setFieldErrors({});
    setError(null);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStepId === "service" && !validateServiceStep()) return;
    if (currentStepId === "date" && !validateDateStep()) return;
    if (isLastStep) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEP_IDS.length - 1));
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
      setDocuments((prev) => [...prev, { name: f.name, size: f.size, mimeType: f.type }]);
    }
    e.target.value = "";
  };

  const removeDocument = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  async function handleSubmit() {
    if (!validatePaymentStep()) return;

    setLoading(true);
    setError(null);

    const vehicleType = category === "idp" ? null : vehicle;
    const payload = {
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
      driverLicense: {
        category,
        vehicleType,
        addons,
        appointmentDate,
        basePriceThb: baseThb,
        addonsTotalThb: addonsThb,
        totalThb,
        currency: "THB",
      },
      documents: documents.map((d) => ({
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
      })),
    };

    const result = await submitBooking({
      serviceId: service.id,
      serviceSlug: "driver-license",
      isGuest,
      userId: userId ?? undefined,
      guestEmail: email.trim(),
      guestName: name.trim(),
      guestPhone: phone.trim(),
      formData: payload,
      documentIds: undefined,
    });

    setLoading(false);

    if (result.success && result.caseNumber) {
      const params = new URLSearchParams();
      params.set("caseNumber", result.caseNumber);
      if (isGuest) {
        params.set("guest", "1");
        params.set("email", email);
      }
      router.push(`/book/confirmation?${params.toString()}`);
      return;
    }
    setError(result.error ?? "Submission failed.");
  }

  const selectCategory = (c: LicenseServiceCategory) => {
    setCategory(c);
    if (c === "idp") setVehicle(null);
    setError(null);
  };

  return (
    <Card>
      <CardHeader className="space-y-4 border-b pb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("wizardTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("wizardLead")}</p>
          <p className="mt-2 text-sm font-medium text-siam-blue dark:text-siam-blue-light">
            {t("emailRouted", { email: site.email })}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("stepLabel", { current: stepIndex + 1, total: STEP_IDS.length })}
        </p>
        <Stepper steps={steps} currentIndex={stepIndex} />
      </CardHeader>
      <CardContent className="pt-6">
        {currentStepId === "service" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("selectServiceTitle")}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("selectServiceHint")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: "conversion" as const, label: "categoryConversion", price: "categoryPriceConversion" },
                  { id: "renewal" as const, label: "categoryRenewal", price: "categoryPriceRenewal" },
                  { id: "apply_new" as const, label: "categoryApplyNew", price: "categoryPriceApplyNew" },
                  { id: "idp" as const, label: "categoryIdp", price: "categoryPriceIdp" },
                ] as const
              ).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectCategory(row.id)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-colors",
                    category === row.id
                      ? "border-siam-blue bg-siam-blue/5 dark:bg-siam-blue/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  )}
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{t(row.label)}</span>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t(row.price)}</p>
                </button>
              ))}
            </div>

            {category && category !== "idp" && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">{t("vehicleTitle")}</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      { id: "bike" as const, label: "vehicleBike" },
                      { id: "car" as const, label: "vehicleCar" },
                      { id: "both" as const, label: "vehicleBoth" },
                    ] as const
                  ).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setVehicle(row.id);
                        setError(null);
                      }}
                      className={cn(
                        "rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                        vehicle === row.id
                          ? "border-siam-blue bg-siam-blue/5 dark:bg-siam-blue/10"
                          : "border-gray-200 dark:border-gray-700"
                      )}
                    >
                      {t(row.label)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {category && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">{t("summaryTotal")}: </span>
                {fmtThb.format(baseThb)}
              </p>
            )}
          </div>
        )}

        {currentStepId === "addons" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("addonsTitle")}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("addonsIntro")}</p>
            </div>
            <ul className="space-y-3">
              {(
                [
                  { key: "fastTrack" as const, label: "addonFastTrack", price: "addonFastTrackPrice" },
                  { key: "translationLetter" as const, label: "addonTranslation", price: "addonTranslationPrice" },
                  { key: "addressCertificate" as const, label: "addonAddress", price: "addonAddressPrice" },
                ] as const
              ).map((row) => (
                <li
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={addons[row.key]}
                      onChange={(e) =>
                        setAddons((p) => ({
                          ...p,
                          [row.key]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
                    />
                    <span className="font-medium text-gray-900 dark:text-white">{t(row.label)}</span>
                  </label>
                  <span className="text-sm font-semibold text-siam-blue dark:text-siam-blue-light">
                    {t(row.price)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("summaryBase")}</span>
                <span className="font-medium">{fmtThb.format(baseThb)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("summaryAddons")}</span>
                <span className="font-medium">{fmtThb.format(addonsThb)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-600">
                <span className="font-semibold text-gray-900 dark:text-white">{t("summaryTotal")}</span>
                <span className="font-semibold text-siam-blue">{fmtThb.format(totalThb)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("skipAddonsNote")}</p>
          </div>
        )}

        {currentStepId === "date" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("dateTitle")}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("dateHint")}</p>
            </div>
            <div>
              <label htmlFor="appt-date" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("dateLabel")}
              </label>
              <Input
                id="appt-date"
                type="date"
                min={minYmd}
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setError(null);
                }}
                className="max-w-xs"
              />
            </div>
          </div>
        )}

        {currentStepId === "payment" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("paymentTitle")}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("paymentLead")}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("summaryBase")}</span>
                <span>{fmtThb.format(baseThb)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("summaryAddons")}</span>
                <span>{fmtThb.format(addonsThb)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold dark:border-gray-600">
                <span>{t("amountToPay")}</span>
                <span className="text-siam-blue">{fmtThb.format(totalThb)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-2 border-b border-gray-200 p-4 dark:border-gray-700">
                <p className="font-semibold text-gray-900 dark:text-white">{t("bankHeading")}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">{t("accountNameLabel")}: </span>
                  {t("accountName")}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">{t("accountNumberLabel")}: </span>
                  <span className="font-mono">{t("accountNumber")}</span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t("promptPayNote")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="dl-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fullName")} *
                </label>
                <Input
                  id="dl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(fieldErrors.name && "border-red-500")}
                />
                {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
              </div>
              <div>
                <label htmlFor="dl-phone" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("phoneWhatsapp")} *
                </label>
                <Input
                  id="dl-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cn(fieldErrors.phone && "border-red-500")}
                />
                {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
              </div>
              <div>
                <label htmlFor="dl-email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("email")} *
                </label>
                <Input
                  id="dl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(fieldErrors.email && "border-red-500")}
                />
                {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
              </div>
              <div>
                <label htmlFor="dl-notes" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("notesOptional")}
                </label>
                <textarea
                  id="dl-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("uploadReceipt")} *</p>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t("receiptHint")}</p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 dark:border-gray-600 dark:bg-gray-800/50">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("uploadReceipt")}</span>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
              </label>
              {documents.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {documents.map((doc, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(idx)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isGuest && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t("guestAccountTitle")}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t("guestAccountBody")}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <a href={loginHref} className="font-medium text-siam-blue hover:underline">
                    {t("guestLogin")}
                  </a>
                  <span className="text-gray-400">·</span>
                  <a href={registerHref} className="font-medium text-siam-blue hover:underline">
                    {t("guestRegister")}
                  </a>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-gray-400">{t("confirmNote", { email: site.email })}</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-8 flex flex-col-reverse justify-between gap-4 sm:flex-row">
          <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0} className="w-full sm:w-auto">
            {t("back")}
          </Button>
          <Button type="button" onClick={handleNext} disabled={loading} className="w-full sm:w-auto">
            {loading ? t("submitting") : isLastStep ? t("confirmSubmit") : t("next")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
