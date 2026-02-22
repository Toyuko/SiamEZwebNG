"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InvoiceQRCode } from "@/components/payments/InvoiceQRCode";
import { qrProvider, bankProvider, wiseProvider } from "@/lib/payments/providers/ManualProvider";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { submitPaymentWithProof } from "@/actions/payment";
import { uploadDocumentMetadataAction } from "@/actions/document";
import { CreditCard, Building2, Globe, Upload, Loader2 } from "lucide-react";

type InvoiceWithRelations = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  caseId: string;
  payments: { id: string; status: string; proofDocument: { id: string } | null }[];
};

interface InvoiceDetailClientProps {
  invoice: InvoiceWithRelations;
  reference: string;
  canPay: boolean;
  hasPendingPayment: boolean;
  userId: string;
}

export function InvoiceDetailClient({
  invoice,
  reference,
  canPay,
  hasPendingPayment,
  userId,
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<"qr" | "bank" | "wise" | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrInstructions = qrProvider.getInstructions(invoice.amount, invoice.currency, reference);
  const bankInstructions = bankProvider.getInstructions(invoice.amount, invoice.currency, reference);
  const wiseInstructions = wiseProvider.getInstructions(invoice.amount, invoice.currency, reference);

  const handleSubmitProof = async () => {
    if (!selectedMethod || !proofFile || !canPay || hasPendingPayment) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", proofFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const { key } = await uploadRes.json();

      const docRes = await uploadDocumentMetadataAction({
        caseId: invoice.caseId,
        name: proofFile.name,
        storageKey: key,
        documentType: "payment_proof",
        uploadedBy: userId,
      });
      if (!docRes.success || !docRes.documentId) throw new Error(docRes.error ?? "Failed to save document");

      const payRes = await submitPaymentWithProof({
        invoiceId: invoice.id,
        method: selectedMethod,
        proofDocumentId: docRes.documentId,
      });
      if (!payRes.success) throw new Error(payRes.error);
      router.refresh();
      setSelectedMethod(null);
      setProofFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {invoice.status === "pending_verification" && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Payment proof submitted. Admin is reviewing your payment.
        </p>
      )}
      {invoice.status === "paid" && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Payment received. Thank you!
        </p>
      )}
      {invoice.status === "rejected" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Payment was rejected. Please contact support or try again.
        </p>
      )}

      {canPay && !hasPendingPayment && (
        <>
          <div>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Payment options
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedMethod === "qr" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMethod("qr")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                QR Code
              </Button>
              <Button
                variant={selectedMethod === "bank" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMethod("bank")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Bank Transfer
              </Button>
              <Button
                variant={selectedMethod === "wise" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMethod("wise")}
              >
                <Globe className="mr-2 h-4 w-4" />
                Wise
              </Button>
            </div>
          </div>

          {selectedMethod === "qr" && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {qrInstructions.label}
              </p>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <InvoiceQRCode
                  amountCents={invoice.amount}
                  reference={reference}
                  size={220}
                  className="rounded-lg border border-gray-200 bg-white p-2"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Amount: {formatCurrency(invoice.amount, invoice.currency)}</p>
                  <p>Reference: {reference}</p>
                  <p className="mt-2">Scan with your bank app or PromptPay.</p>
                </div>
              </div>
            </div>
          )}

          {selectedMethod === "bank" && bankInstructions.details && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {bankInstructions.label}
              </p>
              <dl className="space-y-2 text-sm">
                {Object.entries(bankInstructions.details).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="font-medium text-gray-600 dark:text-gray-400">{k}:</dt>
                    <dd className="text-gray-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {selectedMethod === "wise" && wiseInstructions.details && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {wiseInstructions.label}
              </p>
              <dl className="space-y-2 text-sm">
                {Object.entries(wiseInstructions.details).map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <dt className="font-medium text-gray-600 dark:text-gray-400">{k}</dt>
                    <dd className="whitespace-pre-wrap text-gray-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {selectedMethod && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload payment proof
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 cursor-pointer flex-col gap-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Payment slip or screenshot
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="block w-full text-sm"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <Button
                  onClick={handleSubmitProof}
                  disabled={!proofFile || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit proof
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
