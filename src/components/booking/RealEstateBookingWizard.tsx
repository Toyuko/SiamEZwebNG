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
import { MarketplacePostToggle } from "@/components/booking/MarketplacePostToggle";
import { clientDetailsSchema } from "@/lib/booking-schema";
import { cn } from "@/lib/utils";
import { Building2, FileText, Upload, X } from "lucide-react";

const SERVICE_SLUG = "real-estate-services";

const STEP_IDS = ["serviceType", "propertyBrief", "contact", "review"] as const;
type StepId = (typeof STEP_IDS)[number];

type RequestType = "buy" | "sell" | "rent" | "invest";
type PropertyTypeOption = "condo" | "house" | "townhouse" | "land" | "commercial" | "villa";

interface DocumentMeta {
  name: string;
  size?: number;
  mimeType?: string;
}

interface RealEstateBookingWizardProps {
  service: Service;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

function requestTypeLabel(
  t: ReturnType<typeof useTranslations<"booking.realEstateWizard">>,
  value: RequestType,
) {
  if (value === "buy") return t("requestTypeBuy");
  if (value === "sell") return t("requestTypeSell");
  if (value === "rent") return t("requestTypeRent");
  return t("requestTypeInvest");
}

function propertyTypeLabel(
  t: ReturnType<typeof useTranslations<"booking.realEstateWizard">>,
  value: PropertyTypeOption,
) {
  const map: Record<PropertyTypeOption, string> = {
    condo: t("propertyCondo"),
    house: t("propertyHouse"),
    townhouse: t("propertyTownhouse"),
    land: t("propertyLand"),
    commercial: t("propertyCommercial"),
    villa: t("propertyVilla"),
  };
  return map[value];
}

export function RealEstateBookingWizard({
  service,
  userId,
  userEmail,
  userName,
}: RealEstateBookingWizardProps) {
  const t = useTranslations("booking.realEstateWizard");
  const router = useRouter();
  const locale = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeOption[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredAreas, setPreferredAreas] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [seekerDetails, setSeekerDetails] = useState("");
  const [sellPropertyDetails, setSellPropertyDetails] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [interestedInListing, setInterestedInListing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [postToMarketplace, setPostToMarketplace] = useState(false);

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
  const portalReRedirectPath = `/${locale}/portal/real-estate`;
  const loginReHref = `/${locale}/login?redirect=${encodeURIComponent(portalReRedirectPath)}`;
  const registerReHref = `/${locale}/register?redirect=${encodeURIComponent(portalReRedirectPath)}`;

  const isSeekerFlow = requestType === "buy" || requestType === "rent" || requestType === "invest";
  const isSellFlow = requestType === "sell";

  const togglePropertyType = (value: PropertyTypeOption) => {
    setPropertyTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const validateServiceTypeStep = (): boolean => {
    if (!requestType) {
      setError(t("requestTypeRequired"));
      return false;
    }
    if (propertyTypes.length < 1) {
      setError(t("propertyTypeRequired"));
      return false;
    }
    setError(null);
    return true;
  };

  const validatePropertyBriefStep = (): boolean => {
    if (isSeekerFlow && !preferredAreas.trim()) {
      setError(t("preferredAreasRequired"));
      return false;
    }
    if (isSellFlow && !sellPropertyDetails.trim()) {
      setError(t("sellPropertyRequired"));
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
    if (currentStepId === "propertyBrief" && !validatePropertyBriefStep()) return;
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
      realEstate: {
        requestType,
        propertyTypes,
        interestedInListing,
        timeline: timeline.trim() || undefined,
        seeker: isSeekerFlow
          ? {
              budgetMin: budgetMin.trim() || undefined,
              budgetMax: budgetMax.trim() || undefined,
              preferredAreas: preferredAreas.trim(),
              bedrooms: bedrooms.trim() || undefined,
              details: seekerDetails.trim() || undefined,
            }
          : undefined,
        sell: isSellFlow
          ? {
              propertyDetails: sellPropertyDetails.trim(),
              askingPrice: askingPrice.trim() || undefined,
              propertyLocation: propertyLocation.trim() || undefined,
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
      postToMarketplace,
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
    { id: "propertyBrief", label: t("stepPropertyBrief") },
    { id: "contact", label: t("stepContact") },
    { id: "review", label: t("stepReview") },
  ];

  const budgetLabelMin =
    requestType === "rent" ? t("budgetMinRent") : t("budgetMin");
  const budgetLabelMax =
    requestType === "rent" ? t("budgetMaxRent") : t("budgetMax");

  return (
    <Card>
      <CardHeader className="space-y-4 border-b pb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("wizardTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("wizardLead")}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("inventoryTeaser")}{" "}
            <Link
              href="/real-estate"
              className="font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
            >
              {t("browseInventory")}
            </Link>{" "}
            {t("inventoryTeaserAfter")}
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
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: "buy" as const, label: t("requestTypeBuy") },
                  { id: "sell" as const, label: t("requestTypeSell") },
                  { id: "rent" as const, label: t("requestTypeRent") },
                  { id: "invest" as const, label: t("requestTypeInvest") },
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
              <h4 className="font-semibold text-gray-900 dark:text-white">{t("propertyTypeTitle")}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: "condo" as const, label: t("propertyCondo") },
                    { id: "house" as const, label: t("propertyHouse") },
                    { id: "townhouse" as const, label: t("propertyTownhouse") },
                    { id: "land" as const, label: t("propertyLand") },
                    { id: "commercial" as const, label: t("propertyCommercial") },
                    { id: "villa" as const, label: t("propertyVilla") },
                  ] as const
                ).map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={propertyTypes.includes(row.id)}
                      onChange={() => togglePropertyType(row.id)}
                      className="h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{row.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {currentStepId === "propertyBrief" ? (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("briefTitle")}</h3>

            {isSeekerFlow ? (
              <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {requestType === "rent"
                    ? t("rentSectionTitle")
                    : requestType === "invest"
                      ? t("investSectionTitle")
                      : t("buySectionTitle")}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {budgetLabelMin}
                    </label>
                    <Input
                      placeholder="THB"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {budgetLabelMax}
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
                    {t("preferredAreas")} *
                  </label>
                  <textarea
                    rows={2}
                    value={preferredAreas}
                    placeholder={t("preferredAreasPlaceholder")}
                    onChange={(e) => setPreferredAreas(e.target.value)}
                    className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("bedrooms")}
                  </label>
                  <Input
                    value={bedrooms}
                    placeholder={t("bedroomsPlaceholder")}
                    onChange={(e) => setBedrooms(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("seekerDetails")}
                  </label>
                  <textarea
                    rows={3}
                    value={seekerDetails}
                    placeholder={t("seekerDetailsPlaceholder")}
                    onChange={(e) => setSeekerDetails(e.target.value)}
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
                    {t("sellPropertyDetails")} *
                  </label>
                  <textarea
                    rows={3}
                    value={sellPropertyDetails}
                    placeholder={t("sellPropertyPlaceholder")}
                    onChange={(e) => setSellPropertyDetails(e.target.value)}
                    className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("propertyLocation")}
                  </label>
                  <Input
                    value={propertyLocation}
                    placeholder={t("propertyLocationPlaceholder")}
                    onChange={(e) => setPropertyLocation(e.target.value)}
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

            {isSellFlow ? (
              <div className="rounded-lg border border-siam-blue/20 bg-siam-blue/[0.03] p-4 dark:border-siam-blue/30 dark:bg-siam-blue/5">
                <div className="flex gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-siam-blue dark:text-siam-blue-light" aria-hidden />
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("listingPlatformTitle")}</p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t("listingPlatformBody")}</p>
                    </div>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={interestedInListing}
                        onChange={(e) => setInterestedInListing(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{t("listingPlatformCheckbox")}</span>
                    </label>
                    {interestedInListing ? (
                      isGuest ? (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{t("listingPlatformGuestActions")}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm">
                            <a href={loginReHref} className="font-medium text-siam-blue hover:underline">
                              {t("listingPlatformSignIn")}
                            </a>
                            <span className="text-gray-400">·</span>
                            <a href={registerReHref} className="font-medium text-siam-blue hover:underline">
                              {t("listingPlatformCreateAccount")}
                            </a>
                          </div>
                        </div>
                      ) : (
                        <Button asChild variant="outline" size="sm" className="mt-1 w-full sm:w-auto">
                          <Link href="/portal/real-estate">{t("listingPlatformGoToMyProperties")}</Link>
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

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
                <span className="font-medium">{t("reviewPropertyTypes")}: </span>
                {propertyTypes.length > 0
                  ? propertyTypes.map((v) => propertyTypeLabel(t, v)).join(", ")
                  : "—"}
              </p>
              {isSeekerFlow && preferredAreas ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t("preferredAreas")}: </span>
                  {preferredAreas}
                </p>
              ) : null}
              {isSellFlow && sellPropertyDetails ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t("sellPropertyDetails")}: </span>
                  {sellPropertyDetails}
                </p>
              ) : null}
              {timeline ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t("timeline")}: </span>
                  {timeline}
                </p>
              ) : null}
              {interestedInListing ? (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t("reviewListingPlatform")}: </span>
                  {t("reviewListingPlatformYes")}
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

            <MarketplacePostToggle
              checked={postToMarketplace}
              onCheckedChange={setPostToMarketplace}
              disabled={loading}
            />
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
