"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { submitBooking } from "@/actions/booking";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "details", label: "Your details" },
  { id: "questions", label: "Questions" },
  { id: "documents", label: "Documents" },
  { id: "summary", label: "Summary" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface BookingWizardProps {
  service: Service;
}

export function BookingWizard({ service }: BookingWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepId = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    setError(null);
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    setError(null);
  };

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await submitBooking({
      serviceId: service.id,
      serviceSlug: service.slug,
      isGuest: true,
      guestEmail: (formData.email as string) || undefined,
      guestName: (formData.name as string) || undefined,
      guestPhone: (formData.phone as string) || undefined,
      formData,
      documentIds: (formData.documentIds as string[]) || undefined,
    });
    setLoading(false);
    if (result.success && result.caseNumber) {
      router.push(`/booking/thank-you?caseNumber=${encodeURIComponent(result.caseNumber)}`);
      return;
    }
    setError(result.error ?? "Submission failed.");
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(i)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                i === stepIndex
                  ? "bg-siam-blue text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {currentStepId === "details" && (
          <DetailsStep formData={formData} setFormData={setFormData} />
        )}
        {currentStepId === "questions" && (
          <QuestionsStep service={service} formData={formData} setFormData={setFormData} />
        )}
        {currentStepId === "documents" && (
          <DocumentsStep formData={formData} setFormData={setFormData} />
        )}
        {currentStepId === "summary" && (
          <SummaryStep service={service} formData={formData} />
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? "Submitting…" : isLastStep ? "Submit booking" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsStep({
  formData,
  setFormData,
}: {
  formData: Record<string, unknown>;
  setFormData: (d: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your details</h2>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Full name *</label>
        <input
          id="name"
          type="text"
          required
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          value={(formData.name as string) ?? ""}
          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email *</label>
        <input
          id="email"
          type="email"
          required
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          value={(formData.email as string) ?? ""}
          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone</label>
        <input
          id="phone"
          type="tel"
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          value={(formData.phone as string) ?? ""}
          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
        />
      </div>
    </div>
  );
}

function QuestionsStep({
  service,
  formData,
  setFormData,
}: {
  service: Service;
  formData: Record<string, unknown>;
  setFormData: (d: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => void;
}) {
  const config = service.formConfig as { questions?: { id: string; label: string; type: string }[] } | null;
  const questions = config?.questions ?? [];

  if (questions.length === 0) {
    return (
      <p className="text-gray-500">No additional questions for this service. Click Next.</p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Additional details</h2>
      {questions.map((q) => (
        <div key={q.id}>
          <label htmlFor={q.id} className="mb-1 block text-sm font-medium">{q.label}</label>
          <input
            id={q.id}
            type={q.type === "number" ? "text" : (q.type as "text" | "email" | "tel")}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={(formData[q.id] as string) ?? ""}
            onChange={(e) => setFormData((p) => ({ ...p, [q.id]: e.target.value }))}
          />
        </div>
      ))}
    </div>
  );
}

function DocumentsStep({
  formData,
  setFormData,
}: {
  formData: Record<string, unknown>;
  setFormData: (d: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Documents</h2>
      <p className="text-sm text-gray-500">
        You can upload required documents after booking. For now click Next to continue.
      </p>
      <input
        type="file"
        className="text-sm"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFormData((p) => ({ ...p, documentNote: f.name }));
        }}
      />
    </div>
  );
}

function SummaryStep({ service, formData }: { service: Service; formData: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Summary</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Service: <strong>{service.name}</strong>
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Contact: {[formData.name, formData.email, formData.phone].filter(Boolean).join(" · ")}
      </p>
      {service.type === "quote" && (
        <p className="text-sm text-gray-500">
          You will receive a quote within 24–48 hours. We will email you at {String(formData.email)}.
        </p>
      )}
    </div>
  );
}
