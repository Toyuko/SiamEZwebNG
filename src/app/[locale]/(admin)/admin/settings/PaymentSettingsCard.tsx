"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentSettings } from "@/lib/payment-settings";
import { updateAdminPaymentSettings } from "@/actions/admin";

export function PaymentSettingsCard({ initial }: { initial: PaymentSettings }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentSettings>(initial);

  const onChange = (key: keyof PaymentSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: key === "qrImagePath" ? (value || null) : value }));
  };

  const onSave = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminPaymentSettings(form);
        setMessage("Payment settings saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save settings");
      }
    });
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promptpay-id">PromptPay ID</Label>
            <Input id="promptpay-id" value={form.promptPayId} onChange={(e) => onChange("promptPayId", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr-image-path">QR Image Path (optional)</Label>
            <Input id="qr-image-path" value={form.qrImagePath ?? ""} onChange={(e) => onChange("qrImagePath", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-name">Bank Name</Label>
            <Input id="bank-name" value={form.bankName} onChange={(e) => onChange("bankName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-branch">Bank Branch</Label>
            <Input id="bank-branch" value={form.bankBranch} onChange={(e) => onChange("bankBranch", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-account-name">Bank Account Name</Label>
            <Input id="bank-account-name" value={form.bankAccountName} onChange={(e) => onChange("bankAccountName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-account-number">Bank Account Number</Label>
            <Input id="bank-account-number" value={form.bankAccountNumber} onChange={(e) => onChange("bankAccountNumber", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wise-beneficiary">Wise Beneficiary</Label>
            <Input id="wise-beneficiary" value={form.wiseBeneficiary} onChange={(e) => onChange("wiseBeneficiary", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wise-account-id">Wise Account ID</Label>
            <Input id="wise-account-id" value={form.wiseAccountId} onChange={(e) => onChange("wiseAccountId", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wise-currency">Wise Currency</Label>
            <Input id="wise-currency" value={form.wiseCurrency} onChange={(e) => onChange("wiseCurrency", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wise-details">Wise Details</Label>
          <textarea
            id="wise-details"
            rows={4}
            value={form.wiseDetails}
            onChange={(e) => onChange("wiseDetails", e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wise-note">Wise Note</Label>
          <textarea
            id="wise-note"
            rows={2}
            value={form.wiseNote}
            onChange={(e) => onChange("wiseNote", e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving..." : "Save Payment Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
