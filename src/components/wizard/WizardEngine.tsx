"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Service } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MarketplacePostToggle } from "@/components/booking/MarketplacePostToggle";
import { submitBooking } from "@/actions/booking";
import type { WizardConfig } from "@/config/wizards/types";
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
import { SummaryStep } from "@/components/wizard/steps/SummaryStep";
import { FieldsStep } from "@/components/wizard/steps/FieldsStep";
import {
  DocumentsStep,
  type WizardDocumentMeta,
} from "@/components/wizard/steps/DocumentsStep";
import { ReviewStep } from "@/components/wizard/steps/ReviewStep";

export interface WizardEngineProps {
  config: WizardConfig;
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
      } else {
        defaults[field.name] = "";
      }
    }
  }
  return defaults;
}

export function WizardEngine({
  config,
  service,
  serviceSlug,
  userId,
  userEmail,
  userName,
}: WizardEngineProps) {
  const router = useRouter();
  const storageKey = autosaveStorageKey(serviceSlug, config.autosaveKey);
  const hydratedRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [documents, setDocuments] = useState<WizardDocumentMeta[]>([]);
  const [postToMarketplace, setPostToMarketplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeBanner, setResumeBanner] = useState(false);

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
    formState: { errors },
    watch,
  } = form;

  const watchedValues = watch();

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

  // Autosave debounce
  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = window.setTimeout(() => {
      saveAutosave(storageKey, {
        version: 1,
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
    const requiresDocs = config.steps.some(
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
    const payload = {
      ...shaped,
      documents: documents.map((d) => ({
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
        documentType: d.documentType,
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
      formData: payload,
      documentIds: undefined,
      postToMarketplace,
    });
    setLoading(false);

    if (result.success && result.caseId && result.caseNumber) {
      clearAutosave(storageKey);
      if (result.isFixed) {
        const base = `/checkout/${result.caseId}`;
        const url =
          isGuest && result.guestCheckoutToken
            ? `${base}?token=${encodeURIComponent(result.guestCheckoutToken)}`
            : base;
        router.push(url);
      } else {
        const params = new URLSearchParams();
        params.set("caseNumber", result.caseNumber);
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
  ]);

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
    }

    if (currentStep.type === "documents" && currentStep.documentsRequired) {
      if (documents.length < 1) {
        setError("Please upload at least one document to continue.");
        return;
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
    currentStep,
    documents.length,
    getValues,
    handleSubmit,
    isLastStep,
    visibleSteps.length,
  ]);

  const handleBack = useCallback(() => {
    setError(null);
    clearErrors();
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [clearErrors]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const next: WizardDocumentMeta[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      next.push({
        name: f.name,
        size: f.size,
        mimeType: f.type,
      });
    }
    setDocuments((prev) => [...prev, ...next]);
    e.target.value = "";
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
  };

  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[1] ?? "en"
      : "en";
  const loginHref = `/${locale}/login?redirect=/${locale}/book/${serviceSlug}`;
  const registerHref = `/${locale}/register?redirect=/${locale}/book/${serviceSlug}`;

  const guestFooter =
    !userId && currentStep?.id === "details" ? (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          Want to track your case? Create an account
        </p>
        <p className="mb-3 text-xs text-muted">
          Continue as guest below, or create an account to track your case, upload
          documents, and see invoices.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={loginHref} className="text-sm font-medium text-siam-blue hover:underline">
            Already have an account? Log in
          </a>
          <span className="text-muted">·</span>
          <a
            href={registerHref}
            className="text-sm font-medium text-siam-blue hover:underline"
          >
            Create an account
          </a>
        </div>
      </div>
    ) : null;

  if (!currentStep) return null;

  return (
    <Card>
      <CardHeader className="border-b border-border pb-6">
        <WizardProgress steps={visibleSteps} currentIndex={stepIndex} />
      </CardHeader>
      <CardContent className="pt-6">
        {resumeBanner ? (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-siam-blue/30 bg-siam-blue/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              We restored your saved progress for this booking.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={discardDraft}>
              Start over
            </Button>
          </div>
        ) : null}

        <WizardStepRenderer stepKey={currentStep.id}>
          {currentStep.type === "summary" ? (
            <SummaryStep service={service} description={currentStep.description} />
          ) : null}
          {currentStep.type === "fields" ? (
            <FieldsStep
              step={currentStep}
              control={control}
              errors={errors}
              values={watchedValues as Record<string, unknown>}
              footer={guestFooter}
            />
          ) : null}
          {currentStep.type === "documents" ? (
            <DocumentsStep
              documents={documents}
              description={currentStep.description}
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

        <div className="mt-8 flex flex-col-reverse justify-between gap-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0 || loading}
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
