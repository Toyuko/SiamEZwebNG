"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldHint, FieldLabel } from "@/components/ui/field";
import { ChoiceCard, VehicleStepBar } from "@/components/vehicle-intake/VehicleStepBar";
import {
  trackVehicleEvent,
  useVehicleLeadSource,
} from "@/components/vehicle-intake/useVehicleLeadSource";
import {
  CAR_MAKES,
  CONTACT_METHODS,
  CONTACT_TIMES,
  FUEL_OPTIONS,
  MOTORCYCLE_MAKES,
  NEW_OR_USED,
  PURCHASE_PAYMENT,
  PURCHASE_TIMEFRAME,
  THAI_PROVINCES,
  TRANSMISSION_OPTIONS,
} from "@/config/vehicle-intake";

const DRAFT_KEY = "siamez.vehicle.buy.v1";
const STEPS = ["type", "requirements", "purchase", "contact"] as const;

type Kind = "car" | "motorcycle" | "other";

type BuyDraft = {
  kind: Kind | "";
  make: string;
  makeOther: string;
  model: string;
  yearMin: string;
  yearMax: string;
  budgetMin: string;
  budgetMax: string;
  maxMileageKm: string;
  newOrUsed: string;
  transmission: string;
  fuel: string;
  preferredColour: string;
  province: string;
  city: string;
  mustHaveFeatures: string;
  dealBreakers: string;
  purchasePayment: string;
  purchaseTimeframe: string;
  needDelivery: boolean;
  needTransfer: boolean;
  needInsurance: boolean;
  needInspection: boolean;
  needFinancingHelp: boolean;
  customerName: string;
  customerPhone: string;
  customerLineId: string;
  customerEmail: string;
  preferredContactMethod: string;
  preferredContactTime: string;
  customerLocation: string;
};

const empty: BuyDraft = {
  kind: "",
  make: "",
  makeOther: "",
  model: "",
  yearMin: "",
  yearMax: "",
  budgetMin: "",
  budgetMax: "",
  maxMileageKm: "",
  newOrUsed: "",
  transmission: "",
  fuel: "",
  preferredColour: "",
  province: "",
  city: "",
  mustHaveFeatures: "",
  dealBreakers: "",
  purchasePayment: "",
  purchaseTimeframe: "",
  needDelivery: false,
  needTransfer: false,
  needInsurance: false,
  needInspection: false,
  needFinancingHelp: false,
  customerName: "",
  customerPhone: "",
  customerLineId: "",
  customerEmail: "",
  preferredContactMethod: "",
  preferredContactTime: "",
  customerLocation: "",
};

function num(v: string): number | undefined {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function BuyVehicleForm() {
  const t = useTranslations("vehicleIntake");
  const locale = useLocale();
  const router = useRouter();
  const source = useVehicleLeadSource();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BuyDraft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackVehicleEvent("vehicle_form_opened", { page: "buy" }, locale);
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...empty, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, [locale]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const makes = draft.kind === "motorcycle" ? MOTORCYCLE_MAKES : CAR_MAKES;
  const patch = (partial: Partial<BuyDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const yearOptions = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 1 - i);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(draft.kind);
    if (step === 3) return Boolean(draft.customerName.trim() && (draft.customerPhone.trim() || draft.customerLineId.trim()));
    return true;
  }, [step, draft]);

  function next() {
    if (!canNext) {
      setError(t("requiredHint"));
      return;
    }
    setError(null);
    trackVehicleEvent("vehicle_step_completed", { flow: "buy", step: STEPS[step] }, locale);
    if (step === 0) trackVehicleEvent("vehicle_form_started", { flow: "buy" }, locale);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    if (!canNext) {
      setError(t("requiredHint"));
      return;
    }
    setSubmitting(true);
    setError(null);
    trackVehicleEvent("vehicle_form_submitted", { flow: "buy" }, locale);
    try {
      const res = await fetch("/api/vehicle-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "buy",
          website: "",
          ...source,
          locale,
          contact: {
            customerName: draft.customerName,
            customerPhone: draft.customerPhone,
            customerLineId: draft.customerLineId,
            customerEmail: draft.customerEmail,
            preferredContactMethod: draft.preferredContactMethod,
            preferredContactTime: draft.preferredContactTime,
            customerLocation: draft.customerLocation,
          },
          vehicle: {
            kind: draft.kind,
            make: draft.make,
            makeOther: draft.makeOther,
            model: draft.model,
            yearMin: num(draft.yearMin),
            yearMax: num(draft.yearMax),
            budgetMin: num(draft.budgetMin),
            budgetMax: num(draft.budgetMax),
            maxMileageKm: num(draft.maxMileageKm),
            newOrUsed: draft.newOrUsed,
            transmission: draft.transmission,
            fuel: draft.fuel,
            preferredColour: draft.preferredColour,
            province: draft.province,
            city: draft.city,
            mustHaveFeatures: draft.mustHaveFeatures,
            dealBreakers: draft.dealBreakers,
            purchasePayment: draft.purchasePayment,
            purchaseTimeframe: draft.purchaseTimeframe,
            needDelivery: draft.needDelivery,
            needTransfer: draft.needTransfer,
            needInsurance: draft.needInsurance,
            needInspection: draft.needInspection,
            needFinancingHelp: draft.needFinancingHelp,
          },
          media: [],
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        leadNumber?: string;
        publicToken?: string;
        error?: string;
      };
      if (!res.ok || !json.success || !json.leadNumber) {
        setError(json.error || t("submitError"));
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      const qs = json.publicToken ? `?t=${encodeURIComponent(json.publicToken)}` : "";
      router.push(`/vehicle/confirmation/${json.leadNumber}${qs}`);
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <VehicleStepBar current={step} total={STEPS.length} label={t(`buySteps.${STEPS[step]}`)} />

      {step === 0 && (
        <div className="space-y-3">
          <ChoiceCard selected={draft.kind === "car"} title={t("kind.car")} onClick={() => patch({ kind: "car" })} />
          <ChoiceCard selected={draft.kind === "motorcycle"} title={t("kind.motorcycle")} onClick={() => patch({ kind: "motorcycle" })} />
          <ChoiceCard selected={draft.kind === "other"} title={t("kind.other")} onClick={() => patch({ kind: "other" })} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("fields.make")}</FieldLabel>
            <Select value={draft.make} onChange={(e) => patch({ make: e.target.value })}>
              <option value="">{t("select")}</option>
              {makes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </Field>
          {draft.make === "Other" ? (
            <Field>
              <FieldLabel>{t("fields.makeOther")}</FieldLabel>
              <Input value={draft.makeOther} onChange={(e) => patch({ makeOther: e.target.value })} />
            </Field>
          ) : null}
          <Field>
            <FieldLabel>{t("fields.model")}</FieldLabel>
            <Input value={draft.model} onChange={(e) => patch({ model: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t("fields.yearMin")}</FieldLabel>
              <Select value={draft.yearMin} onChange={(e) => patch({ yearMin: e.target.value })}>
                <option value="">{t("select")}</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t("fields.yearMax")}</FieldLabel>
              <Select value={draft.yearMax} onChange={(e) => patch({ yearMax: e.target.value })}>
                <option value="">{t("select")}</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t("fields.budgetMin")}</FieldLabel>
              <Input inputMode="numeric" value={draft.budgetMin} onChange={(e) => patch({ budgetMin: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>{t("fields.budgetMax")}</FieldLabel>
              <Input inputMode="numeric" value={draft.budgetMax} onChange={(e) => patch({ budgetMax: e.target.value })} />
            </Field>
          </div>
          <Field>
            <FieldLabel>{t("fields.maxMileage")}</FieldLabel>
            <Input inputMode="numeric" value={draft.maxMileageKm} onChange={(e) => patch({ maxMileageKm: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.newOrUsed")}</FieldLabel>
            <Select value={draft.newOrUsed} onChange={(e) => patch({ newOrUsed: e.target.value })}>
              <option value="">{t("select")}</option>
              {NEW_OR_USED.map((v) => (
                <option key={v} value={v}>{t(`newOrUsed.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.transmission")}</FieldLabel>
            <Select value={draft.transmission} onChange={(e) => patch({ transmission: e.target.value })}>
              <option value="">{t("select")}</option>
              {TRANSMISSION_OPTIONS.map((v) => (
                <option key={v} value={v}>{t(`transmission.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.fuel")}</FieldLabel>
            <Select value={draft.fuel} onChange={(e) => patch({ fuel: e.target.value })}>
              <option value="">{t("select")}</option>
              {FUEL_OPTIONS.map((v) => (
                <option key={v} value={v}>{t(`fuel.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.colour")}</FieldLabel>
            <Input value={draft.preferredColour} onChange={(e) => patch({ preferredColour: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.province")}</FieldLabel>
            <Select value={draft.province} onChange={(e) => patch({ province: e.target.value })}>
              <option value="">{t("select")}</option>
              {THAI_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.mustHave")}</FieldLabel>
            <Textarea value={draft.mustHaveFeatures} onChange={(e) => patch({ mustHaveFeatures: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.dealBreakers")}</FieldLabel>
            <Textarea value={draft.dealBreakers} onChange={(e) => patch({ dealBreakers: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("fields.payment")}</FieldLabel>
            <Select value={draft.purchasePayment} onChange={(e) => patch({ purchasePayment: e.target.value })}>
              <option value="">{t("select")}</option>
              {PURCHASE_PAYMENT.map((v) => (
                <option key={v} value={v}>{t(`payment.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.purchaseTimeframe")}</FieldLabel>
            <Select value={draft.purchaseTimeframe} onChange={(e) => patch({ purchaseTimeframe: e.target.value })}>
              <option value="">{t("select")}</option>
              {PURCHASE_TIMEFRAME.map((v) => (
                <option key={v} value={v}>{t(`purchaseTimeframe.${v}`)}</option>
              ))}
            </Select>
          </Field>
          {([
            ["needDelivery", "needDelivery"],
            ["needTransfer", "needTransfer"],
            ["needInsurance", "needInsurance"],
            ["needInspection", "needInspection"],
            ["needFinancingHelp", "needFinancingHelp"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => patch({ [key]: e.target.checked })}
              />
              {t(`fields.${label}`)}
            </label>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t("noAccountHint")}</p>
          <Field>
            <FieldLabel required>{t("fields.name")}</FieldLabel>
            <Input value={draft.customerName} onChange={(e) => patch({ customerName: e.target.value })} autoComplete="name" />
          </Field>
          <Field>
            <FieldLabel required>{t("fields.phone")}</FieldLabel>
            <Input value={draft.customerPhone} onChange={(e) => patch({ customerPhone: e.target.value })} inputMode="tel" />
          </Field>
          <Field>
            <FieldLabel>{t("fields.line")}</FieldLabel>
            <Input value={draft.customerLineId} onChange={(e) => patch({ customerLineId: e.target.value })} />
            <FieldHint>{t("phoneOrLine")}</FieldHint>
          </Field>
          <Field>
            <FieldLabel>{t("fields.email")}</FieldLabel>
            <Input type="email" value={draft.customerEmail} onChange={(e) => patch({ customerEmail: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.contactMethod")}</FieldLabel>
            <Select value={draft.preferredContactMethod} onChange={(e) => patch({ preferredContactMethod: e.target.value })}>
              <option value="">{t("select")}</option>
              {CONTACT_METHODS.map((v) => (
                <option key={v} value={v}>{t(`contactMethod.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.contactTime")}</FieldLabel>
            <Select value={draft.preferredContactTime} onChange={(e) => patch({ preferredContactTime: e.target.value })}>
              <option value="">{t("select")}</option>
              {CONTACT_TIMES.map((v) => (
                <option key={v} value={v}>{t(`contactTime.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.currentLocation")}</FieldLabel>
            <Input value={draft.customerLocation} onChange={(e) => patch({ customerLocation: e.target.value })} />
          </Field>
        </div>
      )}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            {t("back")}
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" className="flex-1" onClick={next}>
            {t("next")}
          </Button>
        ) : (
          <Button type="button" size="lg" className="flex-1" disabled={submitting} onClick={() => void submit()}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        )}
      </div>
    </div>
  );
}
