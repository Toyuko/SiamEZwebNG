"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale } from "next-intl";
import type { Service } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MarketplacePostToggle } from "@/components/booking/MarketplacePostToggle";
import { submitBooking } from "@/actions/booking";
import {
  acceptSmartQuote,
  generateSmartQuote,
  requestCustomQuote,
  type GenerateQuoteResult,
} from "@/actions/quote";
import { uploadWizardDocumentAction } from "@/actions/document";
import { getWizardConfig } from "@/config/wizards";
import type { WizardConfig, WizardRequiredDocument } from "@/config/wizards/types";
import {
  autosaveStorageKey,
  clearAutosave,
  loadAutosave,
  saveAutosave,
} from "@/components/wizard/lib/autosave";
import { validateStep } from "@/components/wizard/lib/build-step-schema";
import { resolveVisibleSteps } from "@/components/wizard/lib/resolve-steps";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { WizardStepRenderer } from "@/components/wizard/WizardStepRenderer";
import { BookingHeader } from "@/components/wizard/BookingHeader";
import { BookingSideSummary } from "@/components/wizard/BookingSideSummary";
import { CompactPriceGuide } from "@/components/wizard/CompactPriceGuide";
import { SummaryStep } from "@/components/wizard/steps/SummaryStep";
import { FieldsStep } from "@/components/wizard/steps/FieldsStep";
import {
  DocumentsStep,
  type WizardDocumentMeta,
} from "@/components/wizard/steps/DocumentsStep";
import { ReviewStep } from "@/components/wizard/steps/ReviewStep";
import { QuoteReviewStep } from "@/components/wizard/steps/QuoteReviewStep";
import { QuoteConciergeAssist } from "@/components/wizard/QuoteConciergeAssist";
import {
  applyWizardPrefill,
  extractDocumentFields,
  extractedFieldsToWizardPrefill,
  formatMissingDocumentWarning,
  getMissingDocuments,
  validateWizardDocument,
} from "@/lib/documents";
import { trackEvent } from "@/lib/analytics";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

type QuoteSuccess = Extract<GenerateQuoteResult, { success: true }>;

function documentsStepConfig(config: WizardConfig) {
  return config.steps.find((s) => s.type === "documents");
}

function resolveRequiredDoc(
  requiredDocuments: WizardRequiredDocument[] | undefined,
  selectedRequiredId: string | null
): WizardRequiredDocument | undefined {
  if (!requiredDocuments?.length) return undefined;
  if (selectedRequiredId) {
    return (
      requiredDocuments.find((r) => r.id === selectedRequiredId) ??
      requiredDocuments[0]
    );
  }
  return requiredDocuments[0];
}

export interface WizardEngineProps {
  service: Service;
  serviceSlug: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

function defaultValuesFromConfig(
  config: WizardConfig,
  seed: Record<string, unknown>
): Record<string, unknown> {
  const defaults: Record<string, unknown> = { ...seed };
  for (const step of config.steps) {
    for (const field of step.fields ?? []) {
      if (defaults[field.name] !== undefined) continue;
      if (field.type === "checkbox") {
        defaults[field.name] = false;
      } else if (field.type === "multiselect") {
        defaults[field.name] = [];
      } else if (field.name === "depositPaymentMethod") {
        defaults[field.name] = "online";
      } else {
        defaults[field.name] = "";
      }
    }
  }
  return defaults;
}

/**
 * Resolve wizard config on the client. Server Components must not pass
 * `WizardConfig` (it may include `buildFormData`, which cannot cross the RSC boundary).
 */
export function WizardEngine(props: WizardEngineProps) {
  const config = getWizardConfig(props.serviceSlug);
  if (!config) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        Booking form unavailable for this service.
      </p>
    );
  }
  return <WizardEngineInner {...props} config={config} />;
}

function WizardEngineInner({
  config,
  service,
  serviceSlug,
  userId,
  userEmail,
  userName,
}: WizardEngineProps & { config: WizardConfig }) {
  const router = useRouter();
  const locale = useLocale();
  const storageKey = autosaveStorageKey(serviceSlug, config.autosaveKey);
  const hydratedRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [documents, setDocuments] = useState<WizardDocumentMeta[]>([]);
  const [postToMarketplace, setPostToMarketplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docWarning, setDocWarning] = useState<string | null>(null);
  const [selectedRequiredId, setSelectedRequiredId] = useState<string | null>(null);
  const [resumeBanner, setResumeBanner] = useState(false);
  const [quote, setQuote] = useState<QuoteSuccess | null>(null);
  const [quoteAccepted, setQuoteAccepted] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<"initial" | "full">("initial");
  const [customQuoteRequested, setCustomQuoteRequested] = useState(false);

  const form = useForm<Record<string, unknown>>({
    defaultValues: defaultValuesFromConfig(config, {
      ...(userEmail ? { email: userEmail } : {}),
      ...(userName ? { name: userName } : {}),
    }),
    mode: "onBlur",
  });

  const {
    control,
    getValues,
    setValue,
    setError: setFormError,
    clearErrors,
    reset,
    formState: { errors, isDirty },
    watch,
  } = form;

  const watchedValues = watch();

  useEffect(() => {
    trackEvent("booking_started", { slug: serviceSlug, service_id: service.id });
  }, [service.id, serviceSlug]);

  // Hydrate from localStorage once
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = loadAutosave(storageKey);
    if (!saved || saved.serviceSlug !== serviceSlug) return;

    const merged = defaultValuesFromConfig(config, {
      ...saved.values,
      ...(userEmail ? { email: userEmail } : {}),
      ...(userName ? { name: userName } : {}),
    });
    reset(merged);
    setDocuments(saved.documents ?? []);
    setPostToMarketplace(Boolean(saved.postToMarketplace));
    setStepIndex(
      Math.min(Math.max(saved.stepIndex ?? 0), Math.max(config.steps.length - 1, 0))
    );
    setResumeBanner(true);
  }, [config, reset, serviceSlug, storageKey, userEmail, userName]);

  // Prefill logged-in identity without wiping draft
  useEffect(() => {
    if (userEmail) setValue("email", userEmail, { shouldDirty: false });
    if (userName) setValue("name", userName, { shouldDirty: false });
  }, [setValue, userEmail, userName]);

  const visibleSteps = useMemo(
    () => resolveVisibleSteps(config, watchedValues as Record<string, unknown>),
    [config, watchedValues]
  );

  // Keep stepIndex in range when visibility changes
  useEffect(() => {
    if (stepIndex >= visibleSteps.length) {
      setStepIndex(Math.max(visibleSteps.length - 1, 0));
    }
  }, [stepIndex, visibleSteps.length]);

  const currentStep = visibleSteps[stepIndex] ?? visibleSteps[0];
  const isLastStep = stepIndex >= visibleSteps.length - 1;
  const isGuest = !userId;
  const canUpload = Boolean(userId);
  const docsStep = useMemo(() => documentsStepConfig(config), [config]);
  const requiredDocuments = docsStep?.requiredDocuments;
  const showSideSummary = serviceSlug === "driver-license";

  const missingDocWarning = useMemo(() => {
    const result = getMissingDocuments(requiredDocuments, documents);
    return formatMissingDocumentWarning(result);
  }, [documents, requiredDocuments]);

  // Autosave debounce
  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = window.setTimeout(() => {
      saveAutosave(storageKey, {
        version: 2,
        serviceSlug,
        stepIndex,
        values: getValues() as Record<string, unknown>,
        documents,
        postToMarketplace,
        savedAt: new Date().toISOString(),
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [
    documents,
    getValues,
    postToMarketplace,
    serviceSlug,
    stepIndex,
    storageKey,
    watchedValues,
  ]);

  const applyFieldErrors = useCallback(
    (fieldErrors: Record<string, string>) => {
      clearErrors();
      for (const [name, message] of Object.entries(fieldErrors)) {
        setFormError(name, { type: "manual", message });
      }
    },
    [clearErrors, setFormError]
  );

  const handleSubmit = useCallback(async () => {
    const requiresDocs = visibleSteps.some(
      (s) => s.type === "documents" && s.documentsRequired
    );
    if (requiresDocs && documents.length < 1) {
      setError("Please upload at least one document to continue.");
      return;
    }

    setLoading(true);
    setError(null);
    const values = getValues() as Record<string, unknown>;
    const shaped = config.buildFormData ? config.buildFormData(values) : values;
    const documentIds = documents
      .map((d) => d.documentId)
      .filter((id): id is string => Boolean(id));
    const payload = {
      ...shaped,
      documents: documents.map((d) => ({
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
        documentType: d.documentType,
        documentId: d.documentId,
        requiredId: d.requiredId,
        uploadStatus: d.uploadStatus,
      })),
    };

    const result = await submitBooking({
      serviceId: service.id,
      serviceSlug,
      isGuest,
      userId: userId ?? undefined,
      guestEmail: (values.email as string) || userEmail || undefined,
      guestName: (values.name as string) || userName || undefined,
      guestPhone: (values.phone as string) || undefined,
      formData: {
        ...payload,
        ...(quote
          ? {
              smartQuoteId: quote.quoteId,
              smartQuoteNumber: quote.quoteNumber,
              smartQuoteTotal: quote.total,
            }
          : {}),
      },
      documentIds: documentIds.length > 0 ? documentIds : undefined,
      postToMarketplace,
      quoteId: quoteAccepted && quote ? quote.quoteId : undefined,
      guestQuoteToken: quote?.guestToken ?? undefined,
      paymentChoice,
    });
    setLoading(false);

    if (result.success && result.caseId && result.caseNumber) {
      clearAutosave(storageKey);
      trackEvent("booking_completed", {
        slug: serviceSlug,
        case_number: result.caseNumber,
        is_guest: isGuest,
        is_fixed: Boolean(result.isFixed),
      });
      if (result.isFixed && !result.payAtOffice) {
        const base = `/checkout/${result.caseId}`;
        const url =
          isGuest && result.guestCheckoutToken
            ? `${base}?token=${encodeURIComponent(result.guestCheckoutToken)}`
            : base;
        router.push(url);
      } else {
        const params = new URLSearchParams();
        params.set("caseNumber", result.caseNumber);
        if (result.payAtOffice) {
          params.set("payAtOffice", "1");
          const appointmentDate = String(values.appointmentDate ?? "").trim();
          if (appointmentDate) params.set("appointmentDate", appointmentDate);
        }
        if (isGuest) {
          params.set("guest", "1");
          params.set("email", String(values.email ?? ""));
        }
        router.push(`/book/confirmation?${params.toString()}`);
      }
      return;
    }
    setError(result.error ?? "Submission failed.");
  }, [
    config,
    documents,
    getValues,
    isGuest,
    postToMarketplace,
    router,
    service.id,
    serviceSlug,
    storageKey,
    userEmail,
    userId,
    userName,
    quote,
    quoteAccepted,
    paymentChoice,
    visibleSteps,
  ]);

  const runGenerateQuote = useCallback(async () => {
    if (!config.enableSmartQuote) return true;
    setLoading(true);
    setError(null);
    const values = getValues() as Record<string, unknown>;
    const result = await generateSmartQuote({
      serviceId: service.id,
      serviceSlug,
      requirements: values,
    });
    setLoading(false);
    if (!result.success) {
      setError(
        result.error ||
          "We're having trouble calculating your quote. You can continue with our standard booking form or contact SiamEZ."
      );
      // Soft-launch fallback: allow continuing without a locked quote
      setQuote(null);
      setQuoteAccepted(false);
      return true;
    }
    setQuote(result);
    setQuoteAccepted(false);
    trackEvent("quote_requested", { slug: serviceSlug, source: "smart_quote" });
    return true;
  }, [config.enableSmartQuote, getValues, service.id, serviceSlug]);

  const handleAcceptQuote = useCallback(async (choice: "initial" | "full" = "initial") => {
    if (!quote) return;
    setLoading(true);
    setError(null);
    const result = await acceptSmartQuote({
      quoteId: quote.quoteId,
      guestToken: quote.guestToken ?? undefined,
      paymentChoice: choice,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not accept quote.");
      if (result.expired) {
        setQuoteAccepted(false);
      }
      return;
    }
    setPaymentChoice(choice);
    setQuoteAccepted(true);
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }, [quote, visibleSteps.length]);

  const handleRequestCustomQuote = useCallback(async () => {
    if (!quote) return;
    setLoading(true);
    setError(null);
    const result = await requestCustomQuote({
      quoteId: quote.quoteId,
      guestToken: quote.guestToken ?? undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not request a custom quote.");
      return;
    }
    setCustomQuoteRequested(true);
    setQuoteAccepted(true);
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }, [quote, visibleSteps.length]);

  const handleNext = useCallback(async () => {
    setError(null);
    setResumeBanner(false);
    if (!currentStep) return;

    if (currentStep.type === "fields") {
      const values = getValues() as Record<string, unknown>;
      const result = validateStep(currentStep, values);
      if (!result.success) {
        applyFieldErrors(result.fieldErrors);
        return;
      }
      clearErrors();

      if (currentStep.generatesQuote && config.enableSmartQuote) {
        const ok = await runGenerateQuote();
        if (!ok) return;
      }
    }

    if (currentStep.type === "quote_review") {
      if (!quoteAccepted) {
        setError("Please accept the quote to continue, or go back to edit your details.");
        return;
      }
    }

    if (currentStep.type === "documents") {
      if (currentStep.documentsRequired && documents.length < 1) {
        setError("Please upload your deposit receipt to continue.");
        return;
      }
      if (missingDocWarning) {
        setDocWarning(missingDocWarning);
      }
    }

    if (isLastStep) {
      await handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }, [
    applyFieldErrors,
    clearErrors,
    config.enableSmartQuote,
    currentStep,
    documents.length,
    getValues,
    handleSubmit,
    isLastStep,
    missingDocWarning,
    quoteAccepted,
    runGenerateQuote,
    visibleSteps.length,
  ]);

  const handleBack = useCallback(() => {
    setError(null);
    clearErrors();
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [clearErrors]);

  const goToStepById = useCallback(
    (stepId: string) => {
      const idx = visibleSteps.findIndex((s) => s.id === stepId);
      if (idx >= 0) setStepIndex(idx);
    },
    [visibleSteps]
  );

  const applyExtractPrefill = useCallback(
    async (meta: {
      fileName: string;
      mimeType?: string;
      documentType?: string;
      storageKey?: string;
      prefillFields?: string[];
    }) => {
      try {
        const extracted = await extractDocumentFields({
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          documentType: meta.documentType,
          storageKey: meta.storageKey,
        });
        const patch = extractedFieldsToWizardPrefill(extracted.fields, {
          currentValues: getValues() as Record<string, unknown>,
          allowFields: meta.prefillFields,
        });
        applyWizardPrefill(patch, (name, value) => {
          setValue(name, value, { shouldDirty: true, shouldValidate: false });
        });
        if (extracted.warnings?.length && !canUpload) {
          setDocWarning((prev) => prev ?? extracted.warnings?.[0] ?? null);
        }
      } catch {
        // Prefill is best-effort
      }
    },
    [canUpload, getValues, setValue]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);

    const missing = getMissingDocuments(requiredDocuments, documents);
    const autoPick =
      selectedRequiredId ??
      missing.missing[0]?.id ??
      missing.optionalMissing[0]?.id ??
      requiredDocuments?.[0]?.id ??
      null;
    const req = resolveRequiredDoc(requiredDocuments, autoPick);
    const documentType = req?.documentType ?? req?.id;
    const requiredId = req?.id;

    const fileList = Array.from(files);
    e.target.value = "";

    for (const file of fileList) {
      const validationError = validateWizardDocument(file);
      if (validationError) {
        setDocWarning(validationError);
        continue;
      }

      if (!canUpload) {
        const meta: WizardDocumentMeta = {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          documentType,
          requiredId,
          uploadStatus: "metadata",
        };
        setDocuments((prev) => [...prev, meta]);
        await applyExtractPrefill({
          fileName: file.name,
          mimeType: file.type,
          documentType,
          prefillFields: req?.prefillFields,
        });
        continue;
      }

      setUploading(true);
      const pending: WizardDocumentMeta = {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        documentType,
        requiredId,
        uploadStatus: "pending",
      };
      setDocuments((prev) => [...prev, pending]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (documentType) formData.append("documentType", documentType);

        const result = await uploadWizardDocumentAction(formData);
        if (!result.success || !result.documentId) {
          setDocuments((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex(
              (d) => d.name === file.name && d.uploadStatus === "pending"
            );
            if (idx >= 0) {
              copy[idx] = {
                ...copy[idx],
                uploadStatus: "metadata",
                error: result.error ?? "Upload failed — saved as metadata",
              };
            }
            return copy;
          });
          setDocWarning(
            result.error ??
              "Upload unavailable. File metadata was kept so you can continue."
          );
          await applyExtractPrefill({
            fileName: file.name,
            mimeType: file.type,
            documentType,
            prefillFields: req?.prefillFields,
          });
          continue;
        }

        setDocuments((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex(
            (d) => d.name === file.name && d.uploadStatus === "pending"
          );
          if (idx >= 0) {
            copy[idx] = {
              ...copy[idx],
              documentId: result.documentId,
              documentType: result.documentType ?? documentType,
              uploadStatus: "uploaded",
              error: undefined,
            };
          }
          return copy;
        });

        if (result.usedMockStorage) {
          setDocWarning(
            "Blob storage token not configured — files use mock:// storage keys locally."
          );
        }

        await applyExtractPrefill({
          fileName: result.name ?? file.name,
          mimeType: result.mimeType ?? file.type,
          documentType: result.documentType ?? documentType,
          storageKey: result.storageKey,
          prefillFields: req?.prefillFields,
        });
      } catch {
        setDocuments((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex(
            (d) => d.name === file.name && d.uploadStatus === "pending"
          );
          if (idx >= 0) {
            copy[idx] = {
              ...copy[idx],
              uploadStatus: "metadata",
              error: "Upload failed — saved as metadata",
            };
          }
          return copy;
        });
        setDocWarning("Upload failed. File metadata was kept so you can continue.");
      } finally {
        setUploading(false);
      }
    }

    if (requiredId) setSelectedRequiredId(null);
  };

  const removeDocument = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const discardDraft = () => {
    clearAutosave(storageKey);
    reset(
      defaultValuesFromConfig(config, {
        ...(userEmail ? { email: userEmail } : {}),
        ...(userName ? { name: userName } : {}),
      })
    );
    setDocuments([]);
    setPostToMarketplace(false);
    setStepIndex(0);
    setResumeBanner(false);
    setDocWarning(null);
    setSelectedRequiredId(null);
    setQuote(null);
    setQuoteAccepted(false);
    setCustomQuoteRequested(false);
    setPaymentChoice("initial");
  };

  const loginHref = `/${locale}/login?redirect=/${locale}/book/${serviceSlug}`;
  const registerHref = `/${locale}/register?redirect=/${locale}/book/${serviceSlug}`;

  const guestFooter =
    !userId && currentStep?.id === "details" ? (
      <div className="rounded-2xl border border-[#DCE6F5] bg-siam-surface/50 p-4">
        <p className="mb-1 text-sm font-semibold text-siam-ink">
          Want to track your booking?
        </p>
        <p className="mb-3 text-xs text-[#64748B]">
          Continue as guest, or create an account to upload documents and see invoices.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={loginHref} className="text-sm font-medium text-siam-blue hover:underline">
            Log in
          </a>
          <span className="text-[#64748B]">·</span>
          <a
            href={registerHref}
            className="text-sm font-medium text-siam-blue hover:underline"
          >
            Create account
          </a>
        </div>
      </div>
    ) : null;

  const continueLabel = (() => {
    if (loading) {
      if (currentStep?.type === "quote_review") return "Working…";
      if (isLastStep) return "Submitting…";
      if (currentStep?.generatesQuote) return "Calculating quote…";
      return "Working…";
    }
    if (isLastStep) {
      return currentStep?.continueLabel ?? "Confirm & submit booking";
    }
    if (currentStep?.type === "quote_review") {
      return quoteAccepted
        ? currentStep.continueLabel ?? "Continue to booking"
        : "Accept quote above";
    }
    return currentStep?.continueLabel ?? "Continue";
  })();

  const hidePrimaryCta =
    currentStep?.type === "quote_review" && !quoteAccepted && !customQuoteRequested;

  if (!currentStep) return null;

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#EEF5FF_0%,#FFFFFF_42%)]">
      <BookingHeader
        serviceSlug={serviceSlug}
        serviceName={service.name}
        dirty={isDirty || stepIndex > 0 || documents.length > 0}
      />

      <div className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
        {serviceSlug === "driver-license" ? (
          <div className="mb-4">
            <h1 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
              Let&apos;s get your driver&apos;s license sorted
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
              A few quick questions to get your quote.
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <h1 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
              Book: {service.name}
            </h1>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-[#DCE6F5] bg-white/90 px-4 py-3 shadow-sm sm:px-5">
          <WizardProgress steps={visibleSteps} currentIndex={stepIndex} />
        </div>

        {resumeBanner ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-siam-blue/5 px-3 py-2 text-sm">
            <p className="text-siam-ink">
              <span className="font-semibold">Welcome back</span>
              <span className="text-[#64748B]"> — your booking is saved.</span>
            </p>
            <button
              type="button"
              onClick={discardDraft}
              className="shrink-0 text-xs font-semibold text-siam-blue hover:underline"
            >
              Start over
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-6",
            showSideSummary && "lg:grid-cols-[minmax(0,1fr)_17.5rem]"
          )}
        >
          <div className="rounded-2xl border border-[#DCE6F5] bg-white p-4 shadow-sm sm:p-6">
            <WizardStepRenderer stepKey={currentStep.id}>
              {currentStep.type === "summary" ? (
                <SummaryStep
                  service={service}
                  serviceSlug={serviceSlug}
                  description={currentStep.description}
                />
              ) : null}
              {currentStep.type === "fields" ? (
                <FieldsStep
                  step={currentStep}
                  control={control}
                  errors={errors}
                  values={watchedValues as Record<string, unknown>}
                  footer={
                    <>
                      {guestFooter}
                      {serviceSlug === "driver-license" && currentStep.id === "service" ? (
                        <CompactPriceGuide />
                      ) : null}
                      {config.enableSmartQuote &&
                      (currentStep.generatesQuote ||
                        currentStep.id === "service" ||
                        currentStep.id === "questions") ? (
                        <QuoteConciergeAssist
                          serviceSlug={serviceSlug}
                          currentRequirements={watchedValues as Record<string, unknown>}
                          onApply={(requirements) => {
                            for (const [name, value] of Object.entries(requirements)) {
                              setValue(name, value, {
                                shouldDirty: true,
                                shouldValidate: false,
                              });
                            }
                          }}
                        />
                      ) : null}
                    </>
                  }
                />
              ) : null}
              {currentStep.type === "quote_review" ? (
                <QuoteReviewStep
                  quote={quote}
                  serviceName={service.name}
                  accepted={quoteAccepted}
                  loading={loading}
                  onAccept={handleAcceptQuote}
                  onRequestCustomQuote={handleRequestCustomQuote}
                  onEdit={() => {
                    setQuoteAccepted(false);
                    setCustomQuoteRequested(false);
                    setStepIndex((i) => Math.max(i - 1, 0));
                  }}
                  onRecalculate={() => {
                    void runGenerateQuote();
                  }}
                />
              ) : null}
              {currentStep.type === "documents" ? (
                <DocumentsStep
                  documents={documents}
                  title={currentStep.label}
                  description={currentStep.description}
                  requiredDocuments={currentStep.requiredDocuments}
                  canUpload={canUpload}
                  uploading={uploading}
                  warning={docWarning ?? missingDocWarning}
                  selectedRequiredId={selectedRequiredId}
                  onSelectRequiredId={setSelectedRequiredId}
                  onFileChange={handleFileChange}
                  onRemove={removeDocument}
                />
              ) : null}
              {currentStep.type === "review" ? (
                <>
                  <ReviewStep
                    service={service}
                    config={config}
                    values={watchedValues as Record<string, unknown>}
                    documents={documents}
                    quote={quote}
                    quoteAccepted={quoteAccepted}
                    paymentChoice={paymentChoice}
                    onEditStep={goToStepById}
                  />
                  {config.showMarketplaceToggle !== false ? (
                    <MarketplacePostToggle
                      checked={postToMarketplace}
                      onCheckedChange={setPostToMarketplace}
                      disabled={loading}
                      className="mt-6"
                    />
                  ) : null}
                </>
              ) : null}
            </WizardStepRenderer>

            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {/* Desktop / tablet actions */}
            <div className="mt-8 hidden items-center justify-between gap-4 sm:flex">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={stepIndex === 0 || loading}
              >
                Back
              </Button>
              {!hidePrimaryCta ? (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {continueLabel}
                </Button>
              ) : null}
            </div>
          </div>

          {showSideSummary ? (
            <BookingSideSummary
              serviceName={service.name}
              values={watchedValues as Record<string, unknown>}
              quote={quote}
              quoteAccepted={quoteAccepted}
              paymentChoice={paymentChoice}
            />
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-[#64748B]">
          Need help?{" "}
          <a href={`mailto:${site.email}`} className="font-medium text-siam-blue hover:underline">
            Contact SiamEZ
          </a>
        </p>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#DCE6F5] bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-5xl gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0 || loading}
            className="min-w-[5.5rem]"
          >
            Back
          </Button>
          {!hidePrimaryCta ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={loading}
              className="flex-1"
            >
              {continueLabel}
            </Button>
          ) : (
            <p className="flex flex-1 items-center justify-center text-xs text-[#64748B]">
              Accept the quote above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
