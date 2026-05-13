"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { submitBooking } from "@/actions/booking";
import { clientDetailsSchema } from "@/lib/booking-schema";
import { cn } from "@/lib/utils";
import { FileText, Upload, X } from "lucide-react";

const SERVICE_SLUG = "car-motorbike-finder-selling-service";

const STEP_IDS = ["serviceType", "vehicleBrief", "contact", "review"] as const;
type StepId = (typeof STEP_IDS)[number];

type RequestType = "buy" | "sell" | "both";
type VehicleType = "cars" | "motorcycles" | "vans" | "bigBikes";

interface DocumentMeta {
  name: string;
  size?: number;
  mimeType?: string;
}

interface CarMotorbikeFinderBookingWizardProps {
  service: Service;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

function requestTypeLabel(t: ReturnType<typeof useTranslations<"booking.vehicleFinderWizard">>, value: RequestType) {
  if (value === "buy") return t("requestTypeBuy");
  if (value === "sell") return t("requestTypeSell");
  return t("requestTypeBoth");
}

export function CarMotorbikeFinderBookingWizard({
  service,
  userId,
  userEmail,
  userName,
}: CarMotorbikeFinderBookingWizardProps) {
  const t = useTranslations("booking.vehicleFinderWizard");
  const tSales = useTranslations("sales");
  const router = useRouter();
  const locale = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredModels, setPreferredModels] = useState("");
  const [sellVehicleDetails, setSellVehicleDetails] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userEmail || userName) {
      if (userEmail) setEmail(userEmail);
      if (userName) setName(userName);
    }
  }, [userEmail, userName]);

  const isGuest = !userId;
  const currentStepId: StepId = STEP_IDS[stepIndex];
  const isLastStep = stepIndex === STEP_IDS.length - 1;
  const loginHref = `/${locale}/login?redirect=/${locale}/book/${SERVICE_SLUG}`;
  const registerHref = `/${locale}/register?redirect=/${locale}/book/${SERVICE_SLUG}`;

  const isBuyFlow = requestType === "buy" || requestType === "both";
  const isSellFlow = requestType === "sell" || requestType === "both";

  const toggleVehicleType = (value: VehicleType) => {
    setVehicleTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const validateServiceTypeStep = (): boolean => {
    if (!requestType) {
      setError(t("requestTypeRequired"));
      return false;
    }
    if (vehicleTypes.length < 1) {
      setError(t("vehicleTypeRequired"));
      return false;
    }
    setError(null);
    return true;
  };

  const validateVehicleBriefStep = (): boolean => {
    if (isBuyFlow && !preferredModels.trim()) {
      setError(t("preferredModelsRequired"));
      return false;
    }
    if (isSellFlow && !sellVehicleDetails.trim()) {
      setError(t("sellVehicleRequired"));
      return false;
    }
    setError(null);
    return true;
  };

  const validateContactStep = (): boolean => {
    const result = clientDetailsSchema.safeParse({ name, email, phone });
    if (!result.success) {
      const errs: Record<string, string> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([k, v]) => {
        if (v?.[0]) errs[k] = v[0];
      });
      setFieldErrors(errs);
      return false;
    }
    setFieldErrors({});
    setError(null);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStepId === "serviceType" && !validateServiceTypeStep()) return;
    if (currentStepId === "vehicleBrief" && !validateVehicleBriefStep()) return;
    if (currentStepId === "contact" && !validateContactStep()) return;
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
    if (!validateContactStep() || !requestType) return;

    setLoading(true);
    setError(null);

    const payload = {
      name,
      email,
      phone,
      lineId: lineId.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      vehicleFinder: {
        requestType,
        vehicleTypes,
        timeline: timeline.trim() || undefined,
        buy: isBuyFlow
          ? {
              budgetMin: budgetMin.trim() || undefined,
              budgetMax: budgetMax.trim() || undefined,
              preferredModels: preferredModels.trim(),
            }
          : undefined,
        sell: isSellFlow
          ? {
              vehicleDetails: sellVehicleDetails.trim(),
              askingPrice: askingPrice.trim() || undefined,
            }
          : undefined,
      },
      documents: documents.map((d) => ({
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
      })),
    };

    const result = await submitBooking({
      serviceId: service.id,
      serviceSlug: SERVICE_SLUG,
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

  const steps = [
    { id: "serviceType", label: t("stepServiceType") },
    { id: "vehicleBrief", label: t("stepVehicleBrief") },
    { id: "contact", label: t("stepContact") },
    { id: "review", label: t("stepReview") },
  ];

  return (
    <Card>
      <CardHeader className="space-y-4 border-b pb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("wizardTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("wizardLead")}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {tSales("finderWizardTeaser")}{" "}
            <Link href="/sales" className="font-medium text-siam-blue hover:underline dark:text-siam-blue-light">
              {tSales("finderBrowseInventory")}
            </Link>{" "}
            {tSales("finderWizardTeaserAfter")}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("stepLabel", { current: stepIndex + 1, total: STEP_IDS.length })}
        </p>
        <Stepper steps={steps} currentIndex={stepIndex} />
      </CardHeader>

      <CardContent className="pt-6">
        {currentStepId === "serviceType" ? (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("requestTypeTitle")}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { id: "buy" as const, label: t("requestTypeBuy") },
                  { id: "sell" as const, label: t("requestTypeSell") },
                  { id: "both" as const, label: t("requestTypeBoth") },
                ] as const
              ).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setRequestType(row.id)}
                  className={cn(
                    "rounded-lg border-2 px-4 py-3 text-left font-medium transition-colors",
                    requestType === row.id
                      ? "border-siam-blue bg-siam-blue/5 dark:bg-siam-blue/10"
                      : "border-gray-200 dark:border-gray-700",
                  )}
                >
                  {row.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">{t("vehicleTypeTitle")}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: "cars" as const, label: t("vehicleCars") },
                    { id: "motorcycles" as const, label: t("vehicleMotorcycles") },
                    { id: "vans" as const, label: t("vehicleVans") },
                    { id: "bigBikes" as const, label: t("vehicleBigBikes") },
                  ] as const
                ).map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={vehicleTypes.includes(row.id)}
                      onChange={() => toggleVehicleType(row.id)}
                      className="h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{row.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {currentStepId === "vehicleBrief" ? (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("briefTitle")}</h3>

            {isBuyFlow ? (
              <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">{t("buySectionTitle")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("budgetMin")}
                    </label>
                    <Input
                      placeholder="THB"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("budgetMax")}
                    </label>
                    <Input
                      placeholder="THB"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("preferredModels")} *
                  </label>
                  <textarea
                    rows={3}
                    value={preferredModels}
                    placeholder={t("preferredModelsPlaceholder")}
                    onChange={(e) => setPreferredModels(e.target.value)}
                    className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
              </div>
            ) : null}

            {isSellFlow ? (
              <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">{t("sellSectionTitle")}</h4>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("sellVehicleDetails")} *
                  </label>
                  <textarea
                    rows={3}
                    value={sellVehicleDetails}
                    placeholder={t("sellVehiclePlaceholder")}
                    onChange={(e) => setSellVehicleDetails(e.target.value)}
                    className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("askingPrice")}
                  </label>
                  <Input
                    placeholder="THB"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("timeline")}
              </label>
              <Input
                value={timeline}
                placeholder={t("timelinePlaceholder")}
                onChange={(e) => setTimeline(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {currentStepId === "contact" ? (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("contactTitle")}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("fullName")} *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(fieldErrors.name && "border-red-500")}
                />
                {fieldErrors.name ? <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("email")} *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(fieldErrors.email && "border-red-500")}
                />
                {fieldErrors.email ? <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("phone")} *</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cn(fieldErrors.phone && "border-red-500")}
                />
                {fieldErrors.phone ? <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("lineId")}</label>
                <Input
                  value={lineId}
                  placeholder="@siamez"
                  onChange={(e) => setLineId(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("location")}</label>
                <Input
                  value={location}
                  placeholder={t("locationPlaceholder")}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("notes")}</label>
                <textarea
                  rows={3}
                  value={notes}
                  placeholder={t("notesPlaceholder")}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("uploadTitle")}</p>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t("uploadHint")}</p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 dark:border-gray-600 dark:bg-gray-800/50">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("uploadButton")}</span>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
              </label>
              {documents.length > 0 ? (
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
              ) : null}
            </div>

            {isGuest ? (
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
            ) : null}
          </div>
        ) : null}

        {currentStepId === "review" ? (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("reviewTitle")}</h3>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("reviewService")}</h4>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">{service.name}</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{t("reviewRequestType")}: </span>
                {requestType ? requestTypeLabel(t, requestType) : "—"}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{t("reviewVehicleTypes")}: </span>
                {vehicleTypes.length > 0
                  ? vehicleTypes.map((v) => {
                      if (v === "cars") return t("vehicleCars");
                      if (v === "motorcycles") return t("vehicleMotorcycles");
                      if (v === "vans") return t("vehicleVans");
                      return t("vehicleBigBikes");
                    }).join(", ")
                  : "—"}
              </p>
              {timeline ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t("timeline")}: </span>
                  {timeline}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("reviewContact")}</h4>
              <p className="mt-1 text-gray-900 dark:text-white">{name}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{email}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{phone}</p>
              {lineId ? <p className="text-sm text-gray-700 dark:text-gray-300">LINE: {lineId}</p> : null}
              {location ? <p className="text-sm text-gray-700 dark:text-gray-300">{location}</p> : null}
            </div>

            {documents.length > 0 ? (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("reviewDocuments", { count: documents.length })}
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {documents.map((d, i) => <li key={i}>{d.name}</li>)}
                </ul>
              </div>
            ) : null}

            <p className="rounded-lg bg-siam-blue/10 p-4 text-sm text-gray-700 dark:text-gray-300">
              {t("reviewQuoteNotice", { email })}
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="mt-8 flex flex-col-reverse justify-between gap-4 sm:flex-row">
          <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0} className="w-full sm:w-auto">
            {t("back")}
          </Button>
          <Button type="button" onClick={handleNext} disabled={loading} className="w-full sm:w-auto">
            {loading ? t("submitting") : isLastStep ? t("submit") : t("next")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
