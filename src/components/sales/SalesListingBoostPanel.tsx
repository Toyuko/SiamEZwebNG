"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SALES_BOOST_PACKAGES } from "@/lib/sales-boost-packages";
import { startOmiseSalesBoostCharge, submitSalesBoostBankTransfer } from "@/actions/sales-boost";
import { uploadUserSalesBoostProofAction } from "@/actions/document";

type BankInfo = {
  bankName: string;
  bankBranch: string;
  bankAccountName: string;
  bankAccountNumber: string;
};

type SalesListingBoostPanelProps = {
  vehicleId: string;
  canBoost: boolean;
  boostOmiseEnabled: boolean;
  boostActive: boolean;
  boostExpiresLabel: string | null;
  isPendingBoost: boolean;
  /** Open boost checkout after creating a listing (query `?openBoost=…`). */
  openBoostOnMount?: boolean;
  initialBoostPackage?: "1w" | "2w" | "4w" | null;
  bank: BankInfo;
};

export function SalesListingBoostPanel({
  vehicleId,
  canBoost,
  boostOmiseEnabled,
  boostActive,
  boostExpiresLabel,
  isPendingBoost,
  openBoostOnMount = false,
  initialBoostPackage = null,
  bank,
}: SalesListingBoostPanelProps) {
  const t = useTranslations("sales.boost");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pkgId, setPkgId] = useState<(typeof SALES_BOOST_PACKAGES)[number]["id"] | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!openBoostOnMount || !canBoost) return;
    setOpen(true);
    if (initialBoostPackage === "1w" || initialBoostPackage === "2w" || initialBoostPackage === "4w") {
      setPkgId(initialBoostPackage);
    }
  }, [openBoostOnMount, initialBoostPackage, canBoost]);

  if (!canBoost) {
    return null;
  }

  const resetModal = () => {
    setPkgId(null);
    setQrUrl(null);
    setError(null);
    setOpen(false);
  };

  const onOmisePay = () => {
    if (!pkgId) {
      setError(t("pickPackageFirst"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await startOmiseSalesBoostCharge({ salesVehicleId: vehicleId, packageId: pkgId });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setQrUrl(res.qrImageUrl ?? null);
      if (!res.qrImageUrl) {
        setError(t("omiseNoQr"));
      }
    });
  };

  const onBankSubmit = (file: File | null) => {
    if (!pkgId) {
      setError(t("pickPackageFirst"));
      return;
    }
    if (!file || file.size === 0) {
      setError(t("needSlip"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const up = await uploadUserSalesBoostProofAction(fd);
      if (!up.success || !up.documentId) {
        setError(up.error ?? t("uploadFailed"));
        return;
      }
      const sub = await submitSalesBoostBankTransfer({
        salesVehicleId: vehicleId,
        packageId: pkgId,
        proofDocumentId: up.documentId,
      });
      if (!sub.success) {
        setError(sub.error);
        return;
      }
      resetModal();
      router.refresh();
    });
  };

  return (
    <>
      {boostActive && boostExpiresLabel ? (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-gray-800 dark:text-gray-100">
          {t("activeUntil", { date: boostExpiresLabel })}
        </div>
      ) : null}

      {isPendingBoost ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-gray-800 dark:text-gray-100">
          {t("pendingBoostBody")}
        </div>
      ) : null}

      {!boostActive && !isPendingBoost && !open ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-300"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {t("openButton")}
        </Button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-boost-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-2">
              <h2 id="sales-boost-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t("modalTitle")}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={resetModal} className="shrink-0">
                {t("close")}
              </Button>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modalSubtitle")}</p>

            <div className="mt-4 grid gap-2">
              {SALES_BOOST_PACKAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPkgId(p.id);
                    setQrUrl(null);
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                    pkgId === p.id
                      ? "border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500"
                      : "border-gray-200 hover:border-yellow-400 dark:border-gray-700"
                  }`}
                >
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {t(`packages.${p.id}.label`)}
                  </span>
                  <span className="text-siam-blue dark:text-siam-blue-light">
                    {t("priceThb", { amount: p.priceThb })}
                  </span>
                </button>
              ))}
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            {boostOmiseEnabled ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("omiseSection")}</p>
                <Button type="button" className="w-full bg-gray-900 text-white hover:bg-gray-800" disabled={pending} onClick={onOmisePay}>
                  {t("omisePayButton")}
                </Button>
                {qrUrl ? (
                  <div className="mx-auto mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-600">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Omise QR URLs are dynamic third-party hosts */}
                    <img src={qrUrl} alt={t("qrAlt")} className="h-auto w-full object-contain" />
                  </div>
                ) : null}
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("omiseAfterPay")}</p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{t("omiseDisabled")}</p>
            )}

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("bankSection")}</p>
              <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <p>
                  <span className="font-medium">{bank.bankName}</span> — {bank.bankBranch}
                </p>
                <p>
                  {bank.bankAccountName} · {bank.bankAccountNumber}
                </p>
              </div>
              <label className="mt-3 block text-sm font-medium text-gray-800 dark:text-gray-200">
                {t("slipLabel")}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-1 block w-full text-sm"
                  disabled={pending}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    if (file) onBankSubmit(file);
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("bankNote")}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
