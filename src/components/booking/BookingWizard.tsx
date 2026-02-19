"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { submitBooking } from "@/actions/booking";
import { clientDetailsSchema } from "@/lib/booking-schema";
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
}

export function BookingWizard({ service, serviceSlug }: BookingWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentStepId = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 1;

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
      isGuest: true,
      guestEmail: (formData.email as string) || undefined,
      guestName: (formData.name as string) || undefined,
      guestPhone: (formData.phone as string) || undefined,
      formData: payload,
      documentIds: undefined,
    });
    setLoading(false);

    if (result.success && result.caseId && result.caseNumber) {
      if (result.isFixed) {
        router.push(`/checkout/${result.caseId}`);
      } else {
        router.push(`/book/confirmation?caseNumber=${encodeURIComponent(result.caseNumber)}`);
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
          <ServiceSummaryStep service={service} />
        )}
        {currentStepId === "details" && (
          <ClientDetailsStep
            formData={formData}
            setFormData={setFormData}
            fieldErrors={fieldErrors}
          />
        )}
        {currentStepId === "documents" && (
          <DocumentUploadStep
            documents={documents}
            onFileChange={handleFileChange}
            onRemove={removeDocument}
          />
        )}
        {currentStepId === "review" && (
          <ReviewStep service={service} formData={formData} documents={documents} />
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

function ServiceSummaryStep({ service }: { service: Service }) {
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
}: {
  formData: Record<string, unknown>;
  setFormData: (d: Record<string, unknown> | ((p: Record<string, unknown>) => Record<string, unknown>)) => void;
  fieldErrors: Record<string, string>;
}) {
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
            Phone
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+66 00 000 0000"
            value={(formData.phone as string) ?? ""}
            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

function DocumentUploadStep({
  documents,
  onFileChange,
  onRemove,
}: {
  documents: DocumentMeta[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Document upload
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Upload required documents. Metadata is saved now; file storage will be added later.
      </p>

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

function ReviewStep({
  service,
  formData,
  documents,
}: {
  service: Service;
  formData: Record<string, unknown>;
  documents: DocumentMeta[];
}) {
  const isFixed = service.type === "fixed";
  const priceAmount = service.priceAmount;
  const priceCurrency = service.priceCurrency ?? "THB";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Review & submit
      </h2>

      <div className="space-y-4">
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
