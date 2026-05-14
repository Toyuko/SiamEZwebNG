"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import QRCode from "qrcode";
import { paymentConfig } from "@/config/payments";
import { generatePromptPayQRPayload } from "@/lib/payments/qr";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_STATIC_QR = "/images/payment/promptpay-static.png";

export type PaymentInformationBankDetails = {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

export type PaymentInformationProps = {
  /** Amount in Thai Baht (e.g. 1500.25). When set (> 0), a PromptPay QR is generated for this exact amount. */
  totalAmountThb?: number;
  /** Optional reference shown to the payer (e.g. invoice or order id). */
  reference?: string;
  /** PromptPay ID for dynamic QR; defaults to `paymentConfig.promptPayId` (configure `PROMPTPAY_ID` at build/runtime). */
  promptPayId?: string;
  /** Controlled slip file; omit for uncontrolled mode with internal state. */
  transferSlipFile?: File | null;
  onTransferSlipChange?: (file: File | null) => void;
  /** Static QR image URL when no dynamic amount QR is shown. Defaults to the site’s Kasikorn / PromptPay template asset. */
  staticQrSrc?: string;
  /** Override displayed bank fields (defaults from `paymentConfig.bank` / i18n). */
  bankDetails?: PaymentInformationBankDetails;
  className?: string;
};

export function PaymentInformation({
  totalAmountThb,
  reference,
  promptPayId,
  transferSlipFile,
  onTransferSlipChange,
  staticQrSrc = DEFAULT_STATIC_QR,
  bankDetails,
  className,
}: PaymentInformationProps) {
  const t = useTranslations("paymentInformation");
  const slipInputId = useId();
  const [uncontrolledSlip, setUncontrolledSlip] = useState<File | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string | null>(null);
  const [dynamicQrError, setDynamicQrError] = useState(false);

  const controlledSlip = transferSlipFile !== undefined;
  const slipFile = controlledSlip ? transferSlipFile! : uncontrolledSlip;

  const setSlipFile = useCallback(
    (file: File | null) => {
      if (!controlledSlip) {
        setUncontrolledSlip(file);
      }
      onTransferSlipChange?.(file);
    },
    [controlledSlip, onTransferSlipChange]
  );

  const bankName = bankDetails?.bankName ?? t("kbankName");
  const accountName = bankDetails?.accountName ?? paymentConfig.bank.accountName;
  const accountNumber = bankDetails?.accountNumber ?? paymentConfig.bank.accountNumber;

  const showDynamicQr =
    typeof totalAmountThb === "number" && Number.isFinite(totalAmountThb) && totalAmountThb > 0;

  useEffect(() => {
    if (!showDynamicQr) {
      setDynamicQrDataUrl(null);
      setDynamicQrError(false);
      return;
    }
    setDynamicQrError(false);
    setDynamicQrDataUrl(null);
    let cancelled = false;
    const thb = totalAmountThb as number;
    const amountCents = Math.round(thb * 100);
    const id = promptPayId ?? paymentConfig.promptPayId;
    const payload = generatePromptPayQRPayload(amountCents, reference, id);
    QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) {
          setDynamicQrDataUrl(url);
          setDynamicQrError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDynamicQrDataUrl(null);
          setDynamicQrError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showDynamicQr, totalAmountThb, reference, promptPayId]);

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  const onSlipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSlipFile(file);
  };

  const amountDisplay =
    showDynamicQr && totalAmountThb !== undefined
      ? formatCurrency(Math.round(totalAmountThb * 100), "THB")
      : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="bg-siam-blue px-6 py-4 text-white">
        <CardTitle className="text-base font-semibold text-white md:text-lg">{t("title")}</CardTitle>
        <p className="mt-1 text-sm text-white/90">{t("description")}</p>
      </div>

      <CardHeader className="border-b border-border pb-4">
        <CardDescription className="text-center text-sm font-medium text-teal-700 dark:text-teal-400">
          {t("scanQrHint")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <section aria-labelledby="payment-qr-heading" className="flex flex-col items-center gap-3">
          <h3 id="payment-qr-heading" className="sr-only">
            {t("qrTitle")}
          </h3>
          <div
            className="rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-gray-950"
            aria-busy={showDynamicQr && !dynamicQrDataUrl && !dynamicQrError}
            aria-label={showDynamicQr && !dynamicQrDataUrl && !dynamicQrError ? t("qrLoading") : undefined}
          >
            {showDynamicQr && dynamicQrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
              <img
                src={dynamicQrDataUrl}
                alt={t("qrAlt")}
                width={256}
                height={256}
                className="h-56 w-56 object-contain md:h-64 md:w-64"
              />
            ) : showDynamicQr && !dynamicQrError ? (
              <div
                className="flex h-56 w-56 items-center justify-center rounded-lg bg-gray-100 text-sm text-muted dark:bg-gray-900 md:h-64 md:w-64"
                role="status"
              >
                {t("qrLoading")}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- public static asset
              <img
                src={staticQrSrc}
                alt={t("qrAlt")}
                width={256}
                height={256}
                className="h-56 w-56 object-contain md:h-64 md:w-64"
              />
            )}
          </div>
          {dynamicQrError ? (
            <p className="max-w-md text-center text-xs text-amber-800 dark:text-amber-200">{t("qrLoadError")}</p>
          ) : null}
          {amountDisplay ? (
            <p className="text-center text-lg font-semibold text-siam-blue">
              <span className="mr-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t("amountLabel")}:</span>
              {amountDisplay}
            </p>
          ) : null}
          {reference ? (
            <p className="text-center text-sm text-muted">
              <span className="font-medium text-gray-800 dark:text-gray-200">{t("referenceLabel")}:</span>{" "}
              <span className="break-all font-mono text-gray-700 dark:text-gray-300">{reference}</span>
            </p>
          ) : null}
          <p className="max-w-md text-center text-xs text-muted">
            {showDynamicQr && dynamicQrDataUrl ? t("dynamicQrNote") : t("staticQrNote")}
          </p>
          <p className="text-center text-xs font-medium text-teal-700 dark:text-teal-400">{t("acceptsAllBanks")}</p>
        </section>

        <section aria-labelledby="payment-bank-heading" className="space-y-4">
          <div className="border-t border-border pt-6">
            <h3 id="payment-bank-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("bankTransferTitle")}
            </h3>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
              <dt className="min-w-[8rem] shrink-0 font-medium text-gray-600 dark:text-gray-400">{t("bankNameLabel")}</dt>
              <dd className="text-gray-900 dark:text-gray-100">{bankName}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
              <dt className="min-w-[8rem] shrink-0 font-medium text-gray-600 dark:text-gray-400">{t("accountNameLabel")}</dt>
              <dd className="text-gray-900 dark:text-gray-100">{accountName}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <dt className="min-w-[8rem] shrink-0 font-medium text-gray-600 dark:text-gray-400">{t("accountNumberLabel")}</dt>
              <dd className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <span className="break-all font-mono text-base font-semibold tracking-wide text-gray-900 dark:text-gray-100">
                  {accountNumber}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start sm:self-center"
                  onClick={copyAccountNumber}
                  aria-label={t("copy")}
                >
                  {copyState === "copied" ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden />
                      {t("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden />
                      {t("copy")}
                    </>
                  )}
                </Button>
                {copyState === "error" ? (
                  <span className="text-xs text-red-600 dark:text-red-400">{t("copyFailed")}</span>
                ) : null}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="payment-slip-heading" className="space-y-2 border-t border-border pt-6">
          <h3 id="payment-slip-heading" className="sr-only">
            {t("uploadSlipLabel")}
          </h3>
          <Label htmlFor={slipInputId}>{t("uploadSlipLabel")}</Label>
          <Input
            id={slipInputId}
            type="file"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            onChange={onSlipInputChange}
            className="cursor-pointer text-sm file:mr-3 file:rounded-md file:bg-siam-blue/10 file:px-3 file:py-1.5 file:text-siam-blue-dark"
          />
          <p className="text-xs text-muted">{t("uploadSlipHint")}</p>
          {slipFile ? (
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {slipFile.name} ({Math.max(1, Math.round(slipFile.size / 1024))} KB)
            </p>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
