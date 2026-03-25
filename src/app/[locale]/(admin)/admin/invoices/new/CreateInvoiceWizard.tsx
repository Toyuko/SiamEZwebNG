"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createInvoiceViaWizard,
  searchCasesForInvoiceWizard,
  searchClientsForInvoiceWizard,
} from "@/actions/invoice";

type ServiceOption = { id: string; name: string; slug: string };

type CaseHit = Awaited<ReturnType<typeof searchCasesForInvoiceWizard>>[number];
type ClientHit = Awaited<ReturnType<typeof searchClientsForInvoiceWizard>>[number];

type LineForm = { description: string; quantity: string; unitThb: string };

const STEPS = [
  { id: "case", label: "Case & client", description: "Link or create" },
  { id: "lines", label: "Line items", description: "Amounts" },
  { id: "terms", label: "Due & status", description: "Send options" },
  { id: "review", label: "Review", description: "Create" },
];

function thbToSatang(s: string): number {
  const n = Number(String(s).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return -1;
  return Math.round(n * 100);
}

function formatCaseLabel(c: CaseHit): string {
  const who =
    c.user?.name ?? c.user?.email ?? c.guestName ?? c.guestEmail ?? "Guest";
  return `${c.caseNumber} — ${who}`;
}

export function CreateInvoiceWizard({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"existing_case" | "new_case">("existing_case");
  const [caseQuery, setCaseQuery] = useState("");
  const [caseHits, setCaseHits] = useState<CaseHit[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [clientType, setClientType] = useState<"registered" | "guest">("registered");
  const [clientQuery, setClientQuery] = useState("");
  const [clientHits, setClientHits] = useState<ClientHit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [lines, setLines] = useState<LineForm[]>([
    { description: "", quantity: "1", unitThb: "" },
  ]);

  const [dueDate, setDueDate] = useState("");
  const [initialStatus, setInitialStatus] = useState<"draft" | "unpaid">("draft");

  const searchCases = useCallback(async (q: string) => {
    const r = await searchCasesForInvoiceWizard(q);
    setCaseHits([...r]);
  }, []);

  const searchClients = useCallback(async (q: string) => {
    const r = await searchClientsForInvoiceWizard(q);
    setClientHits([...r]);
  }, []);

  useEffect(() => {
    if (mode !== "existing_case" || step !== 0) return;
    const q = caseQuery.trim();
    if (q.length < 2) {
      setCaseHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchCases(q);
    }, 300);
    return () => clearTimeout(t);
  }, [caseQuery, mode, step, searchCases]);

  useEffect(() => {
    if (mode !== "new_case" || clientType !== "registered" || step !== 0) return;
    const q = clientQuery.trim();
    if (q.length < 2) {
      setClientHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchClients(q);
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery, clientType, mode, step, searchClients]);

  const totalSatang = lines.reduce((sum, row) => {
    const q = Math.max(1, Math.floor(Number(row.quantity) || 0));
    const u = thbToSatang(row.unitThb);
    if (u < 0) return sum;
    return sum + q * u;
  }, 0);

  function canAdvanceFromStep0(): boolean {
    if (mode === "existing_case") return !!caseId;
    if (!serviceId) return false;
    if (clientType === "registered") return !!userId;
    return !!(guestName.trim() && guestEmail.trim());
  }

  function canAdvanceFromStep1(): boolean {
    if (lines.length === 0) return false;
    for (const row of lines) {
      if (!row.description.trim()) return false;
      const q = Math.floor(Number(row.quantity) || 0);
      if (q < 1) return false;
      if (thbToSatang(row.unitThb) < 0) return false;
    }
    return totalSatang > 0;
  }

  function handleSubmit() {
    setError(null);
    const payload = {
      mode,
      caseId: mode === "existing_case" ? caseId ?? undefined : undefined,
      serviceId: mode === "new_case" ? serviceId : undefined,
      clientType: mode === "new_case" ? clientType : undefined,
      userId: mode === "new_case" && clientType === "registered" ? userId : undefined,
      guestName: mode === "new_case" && clientType === "guest" ? guestName : undefined,
      guestEmail: mode === "new_case" && clientType === "guest" ? guestEmail : undefined,
      guestPhone: mode === "new_case" && clientType === "guest" ? guestPhone : undefined,
      clientAddress,
      lineItems: lines.map((row) => ({
        description: row.description.trim(),
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        unitAmountSatang: thbToSatang(row.unitThb),
      })),
      dueDate: dueDate || null,
      currency: "THB",
      initialStatus,
    };

    startTransition(async () => {
      const res = await createInvoiceViaWizard(payload);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push(`/admin/invoices/${res.invoiceId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New invoice</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create an invoice for an existing case or open a new case and bill the client.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/invoices">Back to list</Link>
        </Button>
      </div>

      <Stepper steps={STEPS} currentIndex={step} className="mb-8" />

      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Case & client</CardTitle>
            <CardDescription>
              Attach this invoice to an existing case, or create a new case with a service and client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "existing_case"}
                  onChange={() => {
                    setMode("existing_case");
                    setCaseId(null);
                  }}
                />
                Existing case
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "new_case"}
                  onChange={() => setMode("new_case")}
                />
                New case
              </label>
            </div>

            {mode === "existing_case" && (
              <div className="space-y-2">
                <Label htmlFor="case-search">Search case</Label>
                <Input
                  id="case-search"
                  placeholder="Case number, email, or name"
                  value={caseQuery}
                  onChange={(e) => setCaseQuery(e.target.value)}
                />
                <ul className="max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  {caseHits.length === 0 && (
                    <li className="px-3 py-2 text-sm text-gray-500">
                      Type at least 2 characters to search…
                    </li>
                  )}
                  {caseHits.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setCaseId(c.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          caseId === c.id ? "bg-siam-blue/10 font-medium text-siam-blue" : ""
                        }`}
                      >
                        {formatCaseLabel(c)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "new_case" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select
                    id="service"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="clientType"
                      checked={clientType === "registered"}
                      onChange={() => {
                        setClientType("registered");
                        setUserId(null);
                      }}
                    />
                    Registered client
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="clientType"
                      checked={clientType === "guest"}
                      onChange={() => setClientType("guest")}
                    />
                    Guest (no account)
                  </label>
                </div>
                {clientType === "registered" && (
                  <div className="space-y-2">
                    <Label htmlFor="client-search">Find client</Label>
                    <Input
                      id="client-search"
                      placeholder="Name or email"
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                    />
                    <ul className="max-h-40 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      {clientHits.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => setUserId(u.id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              userId === u.id ? "bg-siam-blue/10 font-medium text-siam-blue" : ""
                            }`}
                          >
                            {u.name ?? u.email} ({u.email})
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {clientType === "guest" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gname">Guest name</Label>
                      <Input
                        id="gname"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gemail">Guest email</Label>
                      <Input
                        id="gemail"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="gphone">Guest phone (optional)</Label>
                      <Input
                        id="gphone"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="client-address">Client address (for invoice)</Label>
                  <textarea
                    id="client-address"
                    rows={4}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Billing address shown in the PDF invoice"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            )}
            {mode === "existing_case" && (
              <div className="space-y-2">
                <Label htmlFor="existing-client-address">Client address (for invoice)</Label>
                <textarea
                  id="existing-client-address"
                  rows={4}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Billing address shown in the PDF invoice"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
            <CardDescription>Enter amounts in THB (baht). Quantity must be at least 1.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <Label htmlFor={`d-${idx}`}>Description</Label>
                  <Input
                    id={`d-${idx}`}
                    value={row.description}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`q-${idx}`}>Qty</Label>
                  <Input
                    id={`q-${idx}`}
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...next[idx], quantity: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`u-${idx}`}>Unit (THB)</Label>
                  <Input
                    id={`u-${idx}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={row.unitThb}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...next[idx], unitThb: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={lines.length <= 1}
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines([...lines, { description: "", quantity: "1", unitThb: "" }])}
            >
              Add line
            </Button>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subtotal:{" "}
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
                minimumFractionDigits: 2,
              }).format(totalSatang / 100)}
            </p>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Due date & status</CardTitle>
            <CardDescription>
              Draft stays internal; Unpaid marks the invoice as sent (client can pay in the portal when linked to
              their account).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="due">Due date (optional)</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Initial status</Label>
              <Select
                id="status"
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as "draft" | "unpaid")}
              >
                <option value="draft">Draft</option>
                <option value="unpaid">Unpaid (sent)</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Confirm details before creating the invoice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Mode:</span> {mode === "existing_case" ? "Existing case" : "New case"}
            </p>
            {mode === "existing_case" && <p className="font-mono text-xs">Case ID: {caseId}</p>}
            {mode === "new_case" && (
              <p>
                <span className="text-gray-500">Service:</span>{" "}
                {services.find((s) => s.id === serviceId)?.name}
              </p>
            )}
            <p>
              <span className="text-gray-500">Total:</span>{" "}
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
                minimumFractionDigits: 2,
              }).format(totalSatang / 100)}
            </p>
            <p>
              <span className="text-gray-500">Status:</span> {initialStatus}
            </p>
            {clientAddress.trim() && (
              <p>
                <span className="text-gray-500">Client address:</span> {clientAddress}
              </p>
            )}
            {dueDate && (
              <p>
                <span className="text-gray-500">Due:</span> {dueDate}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        <div className="flex gap-2">
          {step < 3 ? (
            <Button
              type="button"
              disabled={
                pending ||
                (step === 0 && !canAdvanceFromStep0()) ||
                (step === 1 && !canAdvanceFromStep1())
              }
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          ) : (
            <Button type="button" disabled={pending || !canAdvanceFromStep1()} onClick={handleSubmit}>
              {pending ? "Creating…" : "Create invoice"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
