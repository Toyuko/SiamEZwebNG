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
import { PhotoUploader } from "@/components/vehicle-intake/PhotoUploader";
import {
  trackVehicleEvent,
  useVehicleLeadSource,
} from "@/components/vehicle-intake/useVehicleLeadSource";
import {
  CAR_MAKES,
  CONDITION_OPTIONS,
  CONTACT_METHODS,
  CONTACT_TIMES,
  FUEL_OPTIONS,
  MOTORCYCLE_MAKES,
  OWNERSHIP_OPTIONS,
  SELL_TIMELINE_OPTIONS,
  THAI_PROVINCES,
  TRANSMISSION_OPTIONS,
  YES_NO_UNKNOWN,
} from "@/config/vehicle-intake";
import type { UploadedVehicleMedia } from "@/lib/vehicle-leads/schema";

const DRAFT_KEY = "siamez.vehicle.sell.v1";
const STEPS = ["type", "info", "condition", "registration", "selling", "photos", "contact"] as const;

type Kind = "car" | "motorcycle" | "other";

type SellDraft = {
  kind: Kind | "";
  make: string;
  makeOther: string;
  model: string;
  year: string;
  variant: string;
  engineSize: string;
  transmission: string;
  fuel: string;
  mileageKm: string;
  colour: string;
  province: string;
  city: string;
  overallCondition: string;
  accidentHistory: string;
  floodDamage: string;
  majorRepairs: string;
  engineCondition: string;
  transmissionCondition: string;
  tireCondition: string;
  modifications: string;
  knownProblems: string;
  serviceHistory: string;
  registeredOwner: string;
  ownershipStatus: string;
  greenBookAvailable: boolean;
  blueBookAvailable: boolean;
  registrationProvince: string;
  taxStatus: string;
  insuranceStatus: string;
  outstandingFinance: string;
  restrictions: string;
  askingPrice: string;
  priceNegotiable: boolean;
  sellTimeline: string;
  reasonForSelling: string;
  acceptRecommendedPrice: boolean;
  customerName: string;
  customerPhone: string;
  customerLineId: string;
  customerEmail: string;
  preferredContactMethod: string;
  preferredContactTime: string;
  customerLocation: string;
  media: UploadedVehicleMedia[];
};

const empty: SellDraft = {
  kind: "",
  make: "",
  makeOther: "",
  model: "",
  year: "",
  variant: "",
  engineSize: "",
  transmission: "",
  fuel: "",
  mileageKm: "",
  colour: "",
  province: "",
  city: "",
  overallCondition: "",
  accidentHistory: "",
  floodDamage: "",
  majorRepairs: "",
  engineCondition: "",
  transmissionCondition: "",
  tireCondition: "",
  modifications: "",
  knownProblems: "",
  serviceHistory: "",
  registeredOwner: "",
  ownershipStatus: "",
  greenBookAvailable: false,
  blueBookAvailable: false,
  registrationProvince: "",
  taxStatus: "",
  insuranceStatus: "",
  outstandingFinance: "",
  restrictions: "",
  askingPrice: "",
  priceNegotiable: true,
  sellTimeline: "",
  reasonForSelling: "",
  acceptRecommendedPrice: false,
  customerName: "",
  customerPhone: "",
  customerLineId: "",
  customerEmail: "",
  preferredContactMethod: "",
  preferredContactTime: "",
  customerLocation: "",
  media: [],
};

function num(v: string): number | undefined {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function SellVehicleForm() {
  const t = useTranslations("vehicleIntake");
  const locale = useLocale();
  const router = useRouter();
  const source = useVehicleLeadSource();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SellDraft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackVehicleEvent("vehicle_form_opened", { page: "sell" }, locale);
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
  const patch = (partial: Partial<SellDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const mediaFor = (category: UploadedVehicleMedia["category"]) =>
    draft.media.filter((m) => m.category === category);
  const setMedia = (category: UploadedVehicleMedia["category"], files: UploadedVehicleMedia[]) =>
    patch({ media: [...draft.media.filter((m) => m.category !== category), ...files] });

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(draft.kind);
    if (step === 1) return Boolean(draft.make && draft.model && draft.year);
    if (step === 6) return Boolean(draft.customerName.trim() && (draft.customerPhone.trim() || draft.customerLineId.trim()));
    return true;
  }, [step, draft]);

  function next() {
    if (!canNext) {
      setError(t("requiredHint"));
      return;
    }
    setError(null);
    trackVehicleEvent("vehicle_step_completed", { flow: "sell", step: STEPS[step] }, locale);
    if (step === 0) trackVehicleEvent("vehicle_form_started", { flow: "sell" }, locale);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    if (!canNext) {
      setError(t("requiredHint"));
      return;
    }
    setSubmitting(true);
    setError(null);
    trackVehicleEvent("vehicle_form_submitted", { flow: "sell" }, locale);
    try {
      const res = await fetch("/api/vehicle-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sell",
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
            year: Number(draft.year),
            variant: draft.variant,
            engineSize: draft.engineSize,
            transmission: draft.transmission,
            fuel: draft.fuel,
            mileageKm: num(draft.mileageKm),
            colour: draft.colour,
            province: draft.province,
            city: draft.city,
            overallCondition: draft.overallCondition,
            accidentHistory: draft.accidentHistory,
            floodDamage: draft.floodDamage,
            majorRepairs: draft.majorRepairs,
            engineCondition: draft.engineCondition,
            transmissionCondition: draft.transmissionCondition,
            tireCondition: draft.tireCondition,
            modifications: draft.modifications,
            knownProblems: draft.knownProblems,
            serviceHistory: draft.serviceHistory,
            registeredOwner: draft.registeredOwner,
            ownershipStatus: draft.ownershipStatus,
            greenBookAvailable: draft.greenBookAvailable,
            blueBookAvailable: draft.blueBookAvailable,
            registrationProvince: draft.registrationProvince,
            taxStatus: draft.taxStatus,
            insuranceStatus: draft.insuranceStatus,
            outstandingFinance: draft.outstandingFinance,
            restrictions: draft.restrictions,
            askingPrice: num(draft.askingPrice),
            priceNegotiable: draft.priceNegotiable,
            sellTimeline: draft.sellTimeline,
            reasonForSelling: draft.reasonForSelling,
            acceptRecommendedPrice: draft.acceptRecommendedPrice,
          },
          media: draft.media,
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

  const yearOptions = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 1 - i);

  return (
    <div className="mx-auto max-w-lg">
      <VehicleStepBar current={step} total={STEPS.length} label={t(`sellSteps.${STEPS[step]}`)} />

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
            <FieldLabel required>{t("fields.make")}</FieldLabel>
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
            <FieldLabel required>{t("fields.model")}</FieldLabel>
            <Input value={draft.model} onChange={(e) => patch({ model: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel required>{t("fields.year")}</FieldLabel>
            <Select value={draft.year} onChange={(e) => patch({ year: e.target.value })}>
              <option value="">{t("select")}</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.variant")}</FieldLabel>
            <Input value={draft.variant} onChange={(e) => patch({ variant: e.target.value })} />
            <FieldHint>{t("optional")}</FieldHint>
          </Field>
          <Field>
            <FieldLabel>{t("fields.engineSize")}</FieldLabel>
            <Input value={draft.engineSize} onChange={(e) => patch({ engineSize: e.target.value })} placeholder="e.g. 350cc / 1.5L" />
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
            <FieldLabel>{t("fields.mileage")}</FieldLabel>
            <Input inputMode="numeric" value={draft.mileageKm} onChange={(e) => patch({ mileageKm: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.colour")}</FieldLabel>
            <Input value={draft.colour} onChange={(e) => patch({ colour: e.target.value })} />
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
            <FieldLabel>{t("fields.city")}</FieldLabel>
            <Input value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("fields.condition")}</FieldLabel>
            <Select value={draft.overallCondition} onChange={(e) => patch({ overallCondition: e.target.value })}>
              <option value="">{t("select")}</option>
              {CONDITION_OPTIONS.map((v) => (
                <option key={v} value={v}>{t(`condition.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.accident")}</FieldLabel>
            <Select value={draft.accidentHistory} onChange={(e) => patch({ accidentHistory: e.target.value })}>
              <option value="">{t("select")}</option>
              {YES_NO_UNKNOWN.map((v) => (
                <option key={v} value={v}>{t(`yesNo.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.flood")}</FieldLabel>
            <Select value={draft.floodDamage} onChange={(e) => patch({ floodDamage: e.target.value })}>
              <option value="">{t("select")}</option>
              {YES_NO_UNKNOWN.map((v) => (
                <option key={v} value={v}>{t(`yesNo.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.engineCondition")}</FieldLabel>
            <Input value={draft.engineCondition} onChange={(e) => patch({ engineCondition: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.transmissionCondition")}</FieldLabel>
            <Input value={draft.transmissionCondition} onChange={(e) => patch({ transmissionCondition: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.tires")}</FieldLabel>
            <Input value={draft.tireCondition} onChange={(e) => patch({ tireCondition: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.repairs")}</FieldLabel>
            <Textarea value={draft.majorRepairs} onChange={(e) => patch({ majorRepairs: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.mods")}</FieldLabel>
            <Textarea value={draft.modifications} onChange={(e) => patch({ modifications: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.problems")}</FieldLabel>
            <Textarea value={draft.knownProblems} onChange={(e) => patch({ knownProblems: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.serviceHistory")}</FieldLabel>
            <Textarea value={draft.serviceHistory} onChange={(e) => patch({ serviceHistory: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t("registrationHint")}</p>
          <Field>
            <FieldLabel>{t("fields.registeredOwner")}</FieldLabel>
            <Input value={draft.registeredOwner} onChange={(e) => patch({ registeredOwner: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.ownership")}</FieldLabel>
            <Select value={draft.ownershipStatus} onChange={(e) => patch({ ownershipStatus: e.target.value })}>
              <option value="">{t("select")}</option>
              {OWNERSHIP_OPTIONS.map((v) => (
                <option key={v} value={v}>{t(`ownership.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.greenBookAvailable} onChange={(e) => patch({ greenBookAvailable: e.target.checked })} />
            {t("fields.greenBook")}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.blueBookAvailable} onChange={(e) => patch({ blueBookAvailable: e.target.checked })} />
            {t("fields.blueBook")}
          </label>
          <Field>
            <FieldLabel>{t("fields.regProvince")}</FieldLabel>
            <Select value={draft.registrationProvince} onChange={(e) => patch({ registrationProvince: e.target.value })}>
              <option value="">{t("select")}</option>
              {THAI_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.tax")}</FieldLabel>
            <Input value={draft.taxStatus} onChange={(e) => patch({ taxStatus: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.insurance")}</FieldLabel>
            <Input value={draft.insuranceStatus} onChange={(e) => patch({ insuranceStatus: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.finance")}</FieldLabel>
            <Input value={draft.outstandingFinance} onChange={(e) => patch({ outstandingFinance: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t("fields.liens")}</FieldLabel>
            <Textarea value={draft.restrictions} onChange={(e) => patch({ restrictions: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("fields.askingPrice")}</FieldLabel>
            <Input inputMode="numeric" value={draft.askingPrice} onChange={(e) => patch({ askingPrice: e.target.value })} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.priceNegotiable} onChange={(e) => patch({ priceNegotiable: e.target.checked })} />
            {t("fields.negotiable")}
          </label>
          <Field>
            <FieldLabel>{t("fields.timeline")}</FieldLabel>
            <Select value={draft.sellTimeline} onChange={(e) => patch({ sellTimeline: e.target.value })}>
              <option value="">{t("select")}</option>
              {SELL_TIMELINE_OPTIONS.map((v) => (
                <option key={v} value={v}>{t(`timeline.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("fields.reason")}</FieldLabel>
            <Textarea value={draft.reasonForSelling} onChange={(e) => patch({ reasonForSelling: e.target.value })} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.acceptRecommendedPrice} onChange={(e) => patch({ acceptRecommendedPrice: e.target.checked })} />
            {t("fields.acceptRecommended")}
          </label>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t("photosHint")}</p>
          {(["front", "rear", "left", "right", "interior", "dashboard", "engine", "tires", "damage", "registration"] as const).map((cat) => (
            <PhotoUploader
              key={cat}
              category={cat}
              label={t(`photos.${cat}`)}
              files={mediaFor(cat)}
              onChange={(files) => setMedia(cat, files)}
            />
          ))}
          <PhotoUploader
            category="video"
            label={t("photos.video")}
            accept="video/*"
            capture={false}
            multiple={false}
            files={mediaFor("video")}
            onChange={(files) => setMedia("video", files)}
          />
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t("noAccountHint")}</p>
          <Field>
            <FieldLabel required>{t("fields.name")}</FieldLabel>
            <Input value={draft.customerName} onChange={(e) => patch({ customerName: e.target.value })} autoComplete="name" />
          </Field>
          <Field>
            <FieldLabel required>{t("fields.phone")}</FieldLabel>
            <Input value={draft.customerPhone} onChange={(e) => patch({ customerPhone: e.target.value })} inputMode="tel" autoComplete="tel" />
          </Field>
          <Field>
            <FieldLabel>{t("fields.line")}</FieldLabel>
            <Input value={draft.customerLineId} onChange={(e) => patch({ customerLineId: e.target.value })} />
            <FieldHint>{t("phoneOrLine")}</FieldHint>
          </Field>
          <Field>
            <FieldLabel>{t("fields.email")}</FieldLabel>
            <Input type="email" value={draft.customerEmail} onChange={(e) => patch({ customerEmail: e.target.value })} autoComplete="email" />
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
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
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
