"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CASE_STATUS_LABELS } from "@/lib/domain/case-status";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  formatThb,
  outstandingSatang,
  parseThbToSatang,
  type LeadSource,
} from "@/lib/jobs/intake";
import { detectProvince, provinceOptions } from "@/lib/calendar/provinces";
import {
  createConfirmedJobAction,
  createPublicJobAction,
  lookupJobCustomerAction,
  lookupPublicJobCustomerAction,
  saveJobIntakeMemoryAction,
  updateConfirmedJobAction,
} from "@/actions/job-intake";
import { CopyJobDetailsButton } from "@/components/admin/jobs/CopyJobDetailsButton";
import type { CaseStatus } from "@prisma/client";

type CreatedJob = {
  id: string;
  customerName: string;
  jobType: string;
  totalSatang: number;
  depositSatang: number;
  outstandingSatang: number;
  invoiceNumber: string;
  invoiceId: string | null;
  invoicePdfPath: string | null;
  receiptNumber: string | null;
  receiptPdfPath: string | null;
  copyText: string;
  customerEmailSent?: boolean;
  secretaryEmailSent?: boolean;
};

type Option = { id: string; name: string };
type StaffOption = { id: string; name: string | null; email: string };
type Candidate = { id: string; name: string | null; email: string; phone: string | null };

export type JobFormValues = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  leadSource: LeadSource | "";
  leadSourceDetail: string;
  closedByStaffId: string;
  assignedStaffId: string;
  scheduledDate: string;
  scheduledTime: string;
  timeTbd: boolean;
  serviceId: string;
  otherServiceName: string;
  jobDescription: string;
  totalPrice: string;
  depositAmount: string;
  location: string;
  province: string;
  documents: string[];
  status: CaseStatus;
  createReceipt: boolean;
};

const EMPTY: JobFormValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  leadSource: "",
  leadSourceDetail: "",
  closedByStaffId: "",
  assignedStaffId: "tbd",
  scheduledDate: "",
  scheduledTime: "",
  timeTbd: false,
  serviceId: "",
  otherServiceName: "",
  jobDescription: "",
  totalPrice: "",
  depositAmount: "0",
  location: "",
  province: "",
  documents: [],
  status: "confirmed",
  createReceipt: true,
};

const fieldClass = "mt-1 min-h-11 w-full text-base";

function staffLabel(staff: StaffOption) {
  return staff.name?.trim() || staff.email;
}

function SearchPicker({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  allowOther,
  allowTbd,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  placeholder: string;
  error?: string;
  allowOther?: boolean;
  allowTbd?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const filtered = options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={selected ? selected.name : placeholder}
        className={fieldClass}
        aria-invalid={Boolean(error)}
      />
      <div className="mt-2 flex max-h-80 flex-col gap-1 overflow-auto">
        {allowTbd && (
          <PickerButton active={value === "tbd" || value === ""} onClick={() => onChange("tbd")}>
            TBD
          </PickerButton>
        )}
        {filtered.map((option) => (
          <PickerButton key={option.id} active={value === option.id} onClick={() => onChange(option.id)}>
            {option.name}
          </PickerButton>
        ))}
        {allowOther && (
          <PickerButton active={value === "other"} onClick={() => onChange("other")}>
            Other
          </PickerButton>
        )}
      </div>
      {selected && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Selected: {selected.name}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function PickerButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-3 text-left text-base ${
        active
          ? "border-siam-blue bg-siam-blue/10 font-medium text-siam-blue"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export function JobIntakeForm({
  mode,
  caseId,
  services,
  staff,
  initial,
  access = "admin",
  issuedReceiptNumber = null,
  savedCopyText = null,
  memoryToken: memoryTokenProp = null,
  initialMemory = "",
  initialCustomerChoice = null,
  initialExistingCustomerId = null,
  linkedCaseId = null,
  snapshotOnly = false,
}: {
  mode: "create" | "edit";
  caseId?: string;
  services: Option[];
  staff: StaffOption[];
  initial?: Partial<JobFormValues>;
  /** "link" is the no-login page staff can open from a shared URL. */
  access?: "admin" | "link";
  issuedReceiptNumber?: string | null;
  /** Copy text built from the saved job, so admin can copy before editing again. */
  savedCopyText?: string | null;
  /** Token for /jobs/saved/[token]. Opening that URL restores details and memory. */
  memoryToken?: string | null;
  initialMemory?: string;
  initialCustomerChoice?: "use_existing" | "create_new" | null;
  initialExistingCustomerId?: string | null;
  linkedCaseId?: string | null;
  /** The confirmed job already exists, so this page only updates the saved link. */
  snapshotOnly?: boolean;
}) {
  const idempotencyKey = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : ""
  );
  const [values, setValues] = useState<JobFormValues>({ ...EMPTY, ...initial });
  const [phase, setPhase] = useState<"edit" | "review">("edit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [docDraft, setDocDraft] = useState("");
  const [emailMatch, setEmailMatch] = useState<Candidate | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [customerChoice, setCustomerChoice] = useState<"use_existing" | "create_new" | null>(
    initialCustomerChoice
  );
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(initialExistingCustomerId);
  const [memoryToken, setMemoryToken] = useState<string | null>(memoryTokenProp);
  const [memory, setMemory] = useState(initialMemory);
  const [savingLink, setSavingLink] = useState(false);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const [created, setCreated] = useState<CreatedJob | null>(null);
  const [knownReceipt, setKnownReceipt] = useState<string | null>(issuedReceiptNumber);
  const provinceTouched = useRef(false);
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const staffOptions = staff.map((person) => ({ id: person.id, name: staffLabel(person) }));
  const totalSatang = parseThbToSatang(values.totalPrice) ?? 0;
  const depositSatang = parseThbToSatang(values.depositAmount || "0") ?? 0;
  const outstanding =
    parseThbToSatang(values.totalPrice) != null && parseThbToSatang(values.depositAmount || "0") != null
      ? outstandingSatang(totalSatang, Math.min(depositSatang, totalSatang))
      : 0;

  const serviceName = useMemo(() => {
    if (values.serviceId === "other") return values.otherServiceName || "Other";
    return services.find((service) => service.id === values.serviceId)?.name ?? "—";
  }, [services, values.otherServiceName, values.serviceId]);

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function memoryDetails() {
    return {
      ...values,
      customerChoice,
      existingCustomerId,
    };
  }

  useEffect(() => {
    if (!memoryToken) {
      setPageUrl(null);
      return;
    }
    setPageUrl(`${window.location.origin}/${locale}/jobs/saved/${memoryToken}`);
  }, [locale, memoryToken]);

  async function saveLink(caseIdToAttach?: string) {
    if (savingLink) return null;
    setSavingLink(true);
    setError(null);
    const attach =
      typeof caseIdToAttach === "string" ? caseIdToAttach : linkedCaseId ?? (mode === "edit" ? caseId ?? null : null);
    const result = await saveJobIntakeMemoryAction({
      token: memoryToken,
      details: memoryDetails(),
      memory,
      caseId: attach,
    });
    setSavingLink(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    setMemoryToken(result.data.token);
    if (result.data.token !== memoryToken) {
      router.replace(`/jobs/saved/${result.data.token}`);
    } else {
      router.refresh();
    }
    return result.data.token;
  }

  async function onEmailBlur() {
    if (!values.customerEmail.trim()) return;
    const result =
      access === "link"
        ? await lookupPublicJobCustomerAction(values.customerEmail, values.customerPhone)
        : await lookupJobCustomerAction(values.customerEmail, values.customerPhone);
    if (!result.ok) return;
    setEmailMatch(result.data.emailMatch);
    setCandidates(result.data.phoneMatches);
    if (result.data.emailMatch) {
      setCustomerChoice("use_existing");
      setExistingCustomerId(result.data.emailMatch.id);
    }
  }

  function addDocument() {
    const name = docDraft.trim();
    if (!name) return;
    if (values.documents.some((doc) => doc.toLowerCase() === name.toLowerCase())) {
      setDocDraft("");
      return;
    }
    set("documents", [...values.documents, name]);
    setDocDraft("");
  }

  function review(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPhase("review");
  }

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const payload = {
      customerName: values.customerName,
      customerEmail: values.customerEmail,
      customerPhone: values.customerPhone,
      leadSource: values.leadSource,
      leadSourceDetail: values.leadSourceDetail,
      closedByStaffId: values.closedByStaffId,
      assignedStaffId: values.assignedStaffId,
      scheduledDate: values.scheduledDate,
      scheduledTime: values.timeTbd ? null : values.scheduledTime,
      timeTbd: values.timeTbd,
      serviceId: values.serviceId,
      otherServiceName: values.otherServiceName,
      jobDescription: values.jobDescription,
      totalPrice: values.totalPrice,
      depositAmount: values.depositAmount,
      location: values.location,
      province: values.province,
      documentsRequired: values.documents,
      idempotencyKey: idempotencyKey.current,
      customerChoice,
      existingCustomerId,
      status: values.status,
      createReceipt: values.createReceipt,
    };
    const result =
      mode === "edit"
        ? await updateConfirmedJobAction(caseId!, payload)
        : access === "link"
          ? await createPublicJobAction(payload)
          : await createConfirmedJobAction(payload);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      if (result.candidates?.length) {
        setCandidates(result.candidates);
        setPhase("edit");
      } else if (result.fieldErrors) {
        setPhase("edit");
      }
      return;
    }
    setCreated({
      id: result.data.id,
      customerName: result.data.customerName,
      jobType: result.data.jobType,
      totalSatang: result.data.totalSatang,
      depositSatang: result.data.depositSatang,
      outstandingSatang: result.data.outstandingSatang,
      invoiceNumber: result.data.invoiceNumber,
      invoiceId: result.data.invoiceId,
      invoicePdfPath:
        "invoicePdfPath" in result.data &&
        (typeof result.data.invoicePdfPath === "string" || result.data.invoicePdfPath === null)
          ? result.data.invoicePdfPath
          : null,
      receiptNumber: result.data.receiptNumber,
      receiptPdfPath:
        "receiptPdfPath" in result.data &&
        (typeof result.data.receiptPdfPath === "string" || result.data.receiptPdfPath === null)
          ? result.data.receiptPdfPath
          : null,
      copyText: result.data.copyText,
      customerEmailSent: result.data.customerEmailSent,
      secretaryEmailSent: result.data.secretaryEmailSent,
    });
    setKnownReceipt(result.data.receiptNumber);
    if (mode === "create") {
      const saved = await saveJobIntakeMemoryAction({
        token: memoryToken,
        details: memoryDetails(),
        memory,
        caseId: result.data.id,
      });
      if (saved.ok) setMemoryToken(saved.data.token);
      else setShareNote("The job was created, but the reference link could not be saved.");
    }
  }

  async function copyDetails(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareNote("Copy is not available in this browser.");
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      window.setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      setShareNote(url);
    }
  }

  async function shareDocument(title: string, text: string, path: string, copiedLabel: string) {
    const url = `${window.location.origin}${path}`;
    const payload = { title, text, url };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareNote(copiedLabel);
    } catch {
      setShareNote(url);
    }
  }

  if (created && mode === "create") {
    const pdf = created.invoicePdfPath ?? (created.invoiceId ? `/api/admin/invoices/${created.invoiceId}/pdf` : null);
    const viewHref = access === "link" ? pdf : created.invoiceId ? `/admin/invoices/${created.invoiceId}` : null;
    const receiptPdf =
      created.receiptPdfPath ??
      (created.receiptNumber && created.invoiceId ? `/api/admin/invoices/${created.invoiceId}/receipt` : null);
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 pb-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            {created.receiptNumber ? "Invoice and receipt ready" : "Invoice ready"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Job created successfully</h1>
          <dl className="mt-4 space-y-2 text-base">
            <Row label="Customer" value={created.customerName} />
            <Row label="Service" value={created.jobType} />
            <Row label="Total" value={formatThb(created.totalSatang)} />
            <Row label="Deposit" value={formatThb(created.depositSatang)} />
            <Row label="Outstanding" value={formatThb(created.outstandingSatang)} />
            <Row label="Invoice" value={created.invoiceNumber} />
            <Row label="Receipt" value={created.receiptNumber ?? "Not created"} />
          </dl>
          {created.customerEmailSent ? (
            <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-200">
              Invoice emailed to the customer.
            </p>
          ) : created.customerEmailSent === false ? (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
              The job was saved, but the invoice email could not be sent.
            </p>
          ) : null}
          {created.secretaryEmailSent ? (
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Job details emailed to the secretary.
            </p>
          ) : created.secretaryEmailSent === false ? (
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              The job was saved, but the secretary email could not be sent.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {viewHref && (
            <Button asChild className="min-h-11">
              {access === "link" ? (
                <a href={viewHref} target="_blank" rel="noreferrer">
                  View Invoice
                </a>
              ) : (
                <Link href={viewHref}>View Invoice</Link>
              )}
            </Button>
          )}
          {pdf && (
            <Button asChild variant="outline" className="min-h-11">
              <a href={pdf} download>
                Download Invoice
              </a>
            </Button>
          )}
          {pdf && (
            <Button asChild variant="outline" className="min-h-11">
              <a href={pdf} target="_blank" rel="noreferrer">
                Print Invoice
              </a>
            </Button>
          )}
          {created.invoiceId && (
            <Button
              type="button"
              variant="primary"
              className="min-h-11"
              onClick={() =>
                shareDocument(
                  "SiamEZ invoice",
                  created.copyText,
                  created.invoicePdfPath ?? `/admin/invoices/${created.invoiceId}`,
                  "Invoice link copied."
                )
              }
            >
              Share Invoice
            </Button>
          )}
          {receiptPdf && (
            <Button asChild variant="outline" className="min-h-11">
              <a href={receiptPdf} target="_blank" rel="noreferrer">
                View Receipt
              </a>
            </Button>
          )}
          {receiptPdf && (
            <Button asChild variant="outline" className="min-h-11">
              <a href={receiptPdf} download>
                Download Receipt
              </a>
            </Button>
          )}
          {receiptPdf && (
            <Button asChild variant="outline" className="min-h-11">
              <a href={receiptPdf} target="_blank" rel="noreferrer">
                Print Receipt
              </a>
            </Button>
          )}
          {created.receiptNumber && created.invoiceId && (
            <Button
              type="button"
              variant="primary"
              className="min-h-11"
              onClick={() =>
                shareDocument(
                  "SiamEZ receipt",
                  created.copyText,
                  created.receiptPdfPath ?? `/api/admin/invoices/${created.invoiceId}/receipt`,
                  "Receipt link copied."
                )
              }
            >
              Share Receipt
            </Button>
          )}
          <Button type="button" variant="outline" className="min-h-11" onClick={() => copyDetails(created.copyText)}>
            {copied ? "Copied!" : "Copy Job Details"}
          </Button>
          {pageUrl ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => copyUrl(pageUrl)}>
              {urlCopied ? "Link copied!" : "Copy saved link"}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-11" disabled={savingLink} onClick={() => saveLink(created.id)}>
              {savingLink ? "Saving link..." : "Save reference link"}
            </Button>
          )}
          {access === "admin" && (
            <Button asChild variant="secondary" className="min-h-11">
              <Link href={`/admin/jobs/${created.id}`}>View Job</Link>
            </Button>
          )}
        </div>
        {pageUrl && (
          <p className="break-all rounded-xl bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-100">
            Saved link: {pageUrl}
          </p>
        )}
        {shareNote && <p className="text-sm text-gray-600 dark:text-gray-300">{shareNote}</p>}
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-100">
          {created.copyText}
        </pre>
      </div>
    );
  }

  const receiptSummary = knownReceipt
    ? knownReceipt
    : values.createReceipt && depositSatang > 0
      ? `Will be created for ${formatThb(depositSatang)}`
      : "Not created";
  const closedByName = staffOptions.find((person) => person.id === values.closedByStaffId)?.name ?? "—";
  const assignedName =
    values.assignedStaffId && values.assignedStaffId !== "tbd"
      ? staffOptions.find((person) => person.id === values.assignedStaffId)?.name ?? "TBD"
      : "TBD";

  return (
    <form
      onSubmit={(event) => {
        if (snapshotOnly) {
          event.preventDefault();
          void saveLink();
          return;
        }
        review(event);
      }}
      className="mx-auto w-full max-w-lg pb-40 md:pb-8"
    >
      <p className="text-sm font-medium text-siam-blue">Confirmed job</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {memoryToken ? "Saved job" : mode === "create" ? "New job" : "Edit job"}
      </h1>
      {pageUrl && (
        <div className="mt-4 space-y-2 rounded-2xl border border-siam-blue/30 bg-siam-blue/5 p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Saved link</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This URL restores the job details and memory note. Anyone with the link can open it, so share it only with staff.
          </p>
          <p className="break-all font-mono text-sm text-gray-900 dark:text-gray-100">{pageUrl}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => copyUrl(pageUrl)}>
            {urlCopied ? "Link copied!" : "Copy URL"}
          </Button>
        </div>
      )}
      {snapshotOnly && linkedCaseId && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          This job was already created. Updating the link keeps the saved details and memory. Job id: {linkedCaseId}
        </p>
      )}
      {mode === "edit" && (created?.copyText || savedCopyText) ? (
        <section className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Job details</h2>
            <CopyJobDetailsButton copyText={created?.copyText ?? savedCopyText ?? ""} className="min-h-11" />
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-100">
            {created?.copyText ?? savedCopyText}
          </pre>
        </section>
      ) : null}
      <ol className="mt-3 flex gap-2 overflow-x-auto text-xs text-gray-500">
        {["Customer", "Schedule", "Service", "Payment", "Documents", "Review"].map((step, index) => (
          <li key={step} className="shrink-0 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">
            {index + 1}. {step}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {phase === "edit" && (
        <section className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold">Memory</h2>
          <p className="text-sm text-gray-500">
            Notes to remember with this job. Saving the link stores these notes and the form details together.
          </p>
          <textarea
            value={memory}
            onChange={(event) => setMemory(event.target.value)}
            rows={4}
            maxLength={8000}
            className="min-h-28 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
            placeholder="Customer asked to keep the appointment in the morning. Passport copy is already on LINE."
          />
        </section>
      )}

      {phase === "review" ? (
        <section className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold">Review</h2>
          <Row label="Customer" value={values.customerName} />
          <Row label="Service" value={serviceName} />
          <Row label="Closed by" value={closedByName} />
          <Row label="Staff" value={assignedName} />
          <Row label="Date" value={values.scheduledDate || "TBD"} />
          <Row label="Time" value={values.timeTbd ? "TBD" : values.scheduledTime || "TBD"} />
          <Row label="Total" value={formatThb(totalSatang)} />
          <Row label="Deposit" value={formatThb(depositSatang)} />
          <Row label="Outstanding" value={formatThb(outstanding)} />
          <Row label="Receipt" value={receiptSummary} />
          <Row label="Location" value={values.location || "—"} />
          <Row label="Province" value={values.province || "Province needed"} />
          <div>
            <p className="text-sm text-gray-500">Memory</p>
            <p className="mt-1 whitespace-pre-wrap text-base">{memory.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Documents</p>
            <ul className="mt-1 list-disc pl-5 text-base">
              {values.documents.length === 0 && <li>None listed</li>}
              {values.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setPhase("edit")}>
              Back to edit
            </Button>
          </div>
        </section>
      ) : (
        <div className="mt-4 space-y-4">
          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-semibold">Customer</h2>
            <Field label="Name" required error={fieldErrors.customerName}>
              <Input
                required
                autoComplete="name"
                value={values.customerName}
                onChange={(event) => set("customerName", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Email" required error={fieldErrors.customerEmail}>
              <Input
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                value={values.customerEmail}
                onChange={(event) => set("customerEmail", event.target.value)}
                onBlur={onEmailBlur}
                className={fieldClass}
              />
            </Field>
            {emailMatch && (
              <p className="rounded-lg bg-siam-blue/10 px-3 py-2 text-sm">
                Existing customer: {emailMatch.name || emailMatch.email}
                {emailMatch.phone ? ` · ${emailMatch.phone}` : ""}. This job will use that customer.
              </p>
            )}
            <Field label="Phone" error={fieldErrors.customerPhone}>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.customerPhone}
                onChange={(event) => set("customerPhone", event.target.value)}
                onBlur={onEmailBlur}
                className={fieldClass}
              />
            </Field>
            {candidates.length > 0 && !emailMatch && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p>A customer with this phone already exists. Choose one, or create a new customer.</p>
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="min-h-11 w-full rounded-lg border bg-white px-3 text-left"
                    onClick={() => {
                      setCustomerChoice("use_existing");
                      setExistingCustomerId(candidate.id);
                      set("customerName", candidate.name || values.customerName);
                      set("customerEmail", candidate.email);
                    }}
                  >
                    Use {candidate.name || candidate.email}
                  </button>
                ))}
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg border px-3 text-left"
                  onClick={() => {
                    setCustomerChoice("create_new");
                    setExistingCustomerId(null);
                  }}
                >
                  Create new customer
                </button>
              </div>
            )}
            <Field label="Source" required error={fieldErrors.leadSource}>
              <select
                required
                value={values.leadSource}
                onChange={(event) => set("leadSource", event.target.value as LeadSource)}
                className={`${fieldClass} rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900`}
              >
                <option value="">Select source</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {LEAD_SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
            </Field>
            {values.leadSource === "other" && (
              <Field label="Other source" required error={fieldErrors.leadSourceDetail}>
                <Input
                  value={values.leadSourceDetail}
                  onChange={(event) => set("leadSourceDetail", event.target.value)}
                  className={fieldClass}
                />
              </Field>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-semibold">Staff and scheduling</h2>
            <SearchPicker
              label="Closed by"
              required
              value={values.closedByStaffId}
              onChange={(id) => set("closedByStaffId", id)}
              options={staffOptions}
              placeholder="Search staff"
              error={fieldErrors.closedByStaffId}
            />
            <SearchPicker
              label="Assigned staff"
              value={values.assignedStaffId}
              onChange={(id) => set("assignedStaffId", id)}
              options={staffOptions}
              placeholder="Search staff or leave TBD"
              allowTbd
              error={fieldErrors.assignedStaffId}
            />
            <Field label="Date" error={fieldErrors.scheduledDate}>
              <Input
                type="date"
                value={values.scheduledDate}
                onChange={(event) => set("scheduledDate", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Time" error={fieldErrors.scheduledTime}>
              <Input
                type="time"
                value={values.scheduledTime}
                disabled={values.timeTbd}
                onChange={(event) => set("scheduledTime", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-base">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={values.timeTbd}
                onChange={(event) => set("timeTbd", event.target.checked)}
              />
              Time is TBD
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-semibold">Service</h2>
            <SearchPicker
              label="Job type"
              required
              value={values.serviceId}
              onChange={(id) => set("serviceId", id)}
              options={services}
              placeholder="Search services"
              allowOther
              error={fieldErrors.serviceId}
            />
            {values.serviceId === "other" && (
              <Field label="Other job type" required error={fieldErrors.otherServiceName}>
                <Input
                  value={values.otherServiceName}
                  onChange={(event) => set("otherServiceName", event.target.value)}
                  className={fieldClass}
                />
              </Field>
            )}
            <Field label="Job description">
              <textarea
                value={values.jobDescription}
                onChange={(event) => set("jobDescription", event.target.value)}
                rows={4}
                className="mt-1 min-h-28 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
                placeholder="Customer requires Thai driver's license conversion from Canadian license. Appointment scheduled at DLT."
              />
            </Field>
            <Field label="Location">
              <Input
                value={values.location}
                onChange={(event) => {
                  const location = event.target.value;
                  setValues((current) => ({
                    ...current,
                    location,
                    province: provinceTouched.current ? current.province : detectProvince(location) ?? current.province,
                  }));
                }}
                placeholder="Bangkok, DLT, customer home…"
                className={fieldClass}
              />
            </Field>
            <SearchPicker
              label="Province"
              value={values.province}
              onChange={(id) => {
                provinceTouched.current = true;
                set("province", id);
              }}
              options={provinceOptions().map((name) => ({ id: name, name }))}
              placeholder="Search provinces"
              error={fieldErrors.province}
            />
            {values.province && (
              <button
                type="button"
                className="min-h-11 text-left text-sm text-gray-600"
                onClick={() => {
                  provinceTouched.current = true;
                  set("province", "");
                }}
              >
                Clear province
              </button>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-semibold">Payment</h2>
            <Field label="Total price (THB)" required error={fieldErrors.totalPrice}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">฿</span>
                <Input
                  required
                  inputMode="decimal"
                  value={values.totalPrice}
                  onChange={(event) => set("totalPrice", event.target.value)}
                  className={`${fieldClass} pl-8`}
                  placeholder="15000"
                />
              </div>
            </Field>
            <Field label="Deposit (THB)" error={fieldErrors.depositAmount}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">฿</span>
                <Input
                  inputMode="decimal"
                  value={values.depositAmount}
                  onChange={(event) => set("depositAmount", event.target.value)}
                  className={`${fieldClass} pl-8`}
                  placeholder="0"
                />
              </div>
            </Field>
            <label className="flex min-h-11 items-start gap-3 text-base">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={values.createReceipt}
                onChange={(event) => set("createReceipt", event.target.checked)}
              />
              <span>
                Create receipt
                <span className="mt-0.5 block text-sm text-gray-500">
                  Also issue a receipt for the amount received. The invoice is still created.
                </span>
              </span>
            </label>
            <div className="rounded-xl bg-gray-50 p-3 text-base dark:bg-gray-900">
              <Row label="Total" value={formatThb(totalSatang)} />
              <Row label="Deposit" value={formatThb(depositSatang)} />
              <Row label="Outstanding" value={formatThb(Math.max(0, outstanding))} />
              <Row label="Receipt" value={receiptSummary} />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-semibold">Documents to prepare</h2>
            <div className="flex gap-2">
              <Input
                value={docDraft}
                onChange={(event) => setDocDraft(event.target.value)}
                placeholder="Passport"
                className={fieldClass}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDocument();
                  }
                }}
              />
              <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={addDocument}>
                Add Document
              </Button>
            </div>
            <ul className="space-y-2">
              {values.documents.map((doc) => (
                <li key={doc} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <span>{doc}</span>
                  <button
                    type="button"
                    className="min-h-11 px-2 text-sm text-red-600"
                    onClick={() =>
                      set(
                        "documents",
                        values.documents.filter((item) => item !== doc)
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {mode === "edit" && (
            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-lg font-semibold">Status</h2>
              <select
                value={values.status}
                onChange={(event) => set("status", event.target.value as CaseStatus)}
                className={`${fieldClass} rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900`}
              >
                {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {CASE_STATUS_LABELS[status].en}
                  </option>
                ))}
              </select>
            </section>
          )}
        </div>
      )}

      {created && mode === "edit" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Job saved. Invoice {created.invoiceNumber}
          {created.receiptNumber ? `. Receipt ${created.receiptNumber}` : ""}. The job details above are ready to copy.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-800 dark:bg-gray-950 md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
        {snapshotOnly ? (
          <Button type="button" className="min-h-12 w-full text-base" disabled={savingLink} onClick={() => saveLink()}>
            {savingLink ? "Saving link..." : "Update saved link"}
          </Button>
        ) : phase === "review" ? (
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" className="min-h-11 w-full text-base" disabled={savingLink || pending} onClick={() => saveLink()}>
              {savingLink ? "Saving link..." : memoryToken ? "Update saved link" : "Save link"}
            </Button>
            <Button type="button" className="min-h-12 w-full text-base" disabled={pending} onClick={submit}>
              {pending ? "Creating job..." : mode === "create" ? "CREATE CONFIRMED JOB" : "Save job"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" className="min-h-11 w-full text-base" disabled={savingLink} onClick={() => saveLink()}>
              {savingLink ? "Saving link..." : memoryToken ? "Update saved link" : "Save link"}
            </Button>
            <Button type="submit" className="min-h-12 w-full text-base">
              Review job
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-base">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

