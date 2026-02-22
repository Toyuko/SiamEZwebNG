"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approvePayment, rejectPayment } from "@/actions/payment";
import { Check, X, Loader2, ExternalLink } from "lucide-react";

interface PaymentReviewClientProps {
  paymentId: string;
  proofDocument: { id: string; name: string; storageKey: string } | null;
}

export function PaymentReviewClient({
  paymentId,
  proofDocument,
}: PaymentReviewClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading("approve");
    setError(null);
    try {
      const res = await approvePayment(paymentId);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    setError(null);
    try {
      const res = await rejectPayment(paymentId);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {proofDocument && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Payment proof
          </p>
          <a
            href={proofDocument.storageKey.startsWith("http") ? proofDocument.storageKey : `https://${proofDocument.storageKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-siam-blue hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {proofDocument.name}
          </a>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          disabled={loading !== null}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Approve
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={loading !== null}
          className="border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          {loading === "reject" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <X className="mr-2 h-4 w-4" />
              Reject
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
