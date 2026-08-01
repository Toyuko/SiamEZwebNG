"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Service } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MarketplacePostToggle } from "@/components/booking/MarketplacePostToggle";
import { submitBooking } from "@/actions/booking";
import { uploadWizardDocumentAction } from "@/actions/document";
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
import { SummaryStep } from "@/components/wizard/steps/SummaryStep";
import { FieldsStep } from "@/components/wizard/steps/FieldsStep";
import {
  DocumentsStep,
  type WizardDocumentMeta,
} from "@/components/wizard/steps/DocumentsStep";
import { ReviewStep } from "@/components/wizard/steps/ReviewStep";
import {
  applyWizardPrefill,
  extractDocumentFields,
  extractedFieldsToWizardPrefill,
  formatMissingDocumentWarning,
  getMissingDocuments,
  validateWizardDocument,
} from "@/lib/documents";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docWarning, setDocWarning] = useState<string | null>(null);
  const [selectedRequiredId, setSelectedRequiredId] = useState<string | null>(null);
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
  const canUpload = Boolean(userId);
  const docsStep = useMemo(() => documentsStepConfig(config), [config]);
  const requiredDocuments = docsStep?.requiredDocuments;

  const missingDocWarning = useMemo(() => {
    const result = getMissingDocuments(requiredDocuments, documents);
    return formatMissingDocumentWarning(result);
  }, [documents, requiredDocuments]);

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
      formData: payload,
      documentIds: documentIds.length > 0 ? documentIds : undefined,
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

    if (currentStep.type === "documents") {
      if (currentStep.documentsRequired && documents.length < 1) {
        setError("Please upload at least one document to continue.");
        return;
      }
      // Soft warn on missing checklist items — guests and partial uploads may continue.
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
    currentStep,
    documents.length,
    getValues,
    handleSubmit,
    isLastStep,
    missingDocWarning,
    visibleSteps.length,
  ]);

  const handleBack = useCallback(() => {
    setError(null);
    clearErrors();
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [clearErrors]);

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
          // Guest path already shows guest banner; keep OCR note mild.
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
