"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export type SalesListingInput = {
  title: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceAmount: number;
  priceCurrency: string;
  category: "car" | "motorcycle";
  status: "available" | "reserved" | "sold";
  heroImageUrl: string;
  imageUrls: string[];
  description: string;
  specifications: Record<string, string>;
  published: boolean;
};

const EMPTY_FORM: SalesListingInput = {
  title: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  mileageKm: 0,
  priceAmount: 0,
  priceCurrency: "THB",
  category: "car",
  status: "available",
  heroImageUrl: "",
  imageUrls: [],
  description: "",
  specifications: {},
  published: true,
};

export function SalesListingFormModal({
  open,
  onClose,
  initialData,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  initialData: SalesListingInput | null;
  onSubmit: (data: SalesListingInput) => void;
  pending: boolean;
}) {
  const t = useTranslations("salesAdminForm");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SalesListingInput>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [specDraftKey, setSpecDraftKey] = useState("");
  const [specDraftValue, setSpecDraftValue] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormError("");
    setSpecDraftKey("");
    setSpecDraftValue("");
    setForm(initialData ?? EMPTY_FORM);
  }, [open, initialData]);

  const disabled = pending || uploading;
  const totalSteps = 3;

  const addSpec = () => {
    const key = specDraftKey.trim();
    const value = specDraftValue.trim();
    if (!key || !value) return;
    setForm((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value,
      },
    }));
    setSpecDraftKey("");
    setSpecDraftValue("");
  };

  const removeSpec = (key: string) => {
    setForm((prev) => {
      const next = { ...prev.specifications };
      delete next[key];
      return { ...prev, specifications: next };
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setFormError("");
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        if (!res.ok) {
          throw new Error(t("errors.uploadFailed"));
        }
        const json = (await res.json()) as { url?: string };
        if (json.url) uploadedUrls.push(json.url);
      }
      setForm((prev) => {
        const merged = Array.from(new Set([...prev.imageUrls, ...uploadedUrls]));
        return {
          ...prev,
          imageUrls: merged,
          heroImageUrl: prev.heroImageUrl || merged[0] || "",
        };
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.make.trim() || !form.model.trim() || !form.title.trim()) return t("errors.step1Required");
      if (form.priceAmount <= 0) return t("errors.priceInvalid");
      if (form.year < 1950) return t("errors.yearInvalid");
      return "";
    }
    if (step === 2) {
      if (form.imageUrls.length === 0) return t("errors.imageRequired");
      if (!form.heroImageUrl) return t("errors.heroRequired");
      return "";
    }
    if (step === 3) {
      if (form.description.trim().length < 20) return t("errors.descriptionShort");
      return "";
    }
    return "";
  };

  const goNext = () => {
    const err = validateStep();
    setFormError(err);
    if (err) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const submit = () => {
    const err = validateStep();
    setFormError(err);
    if (err) return;
    onSubmit({
      ...form,
      title: form.title.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      description: form.description.trim(),
      imageUrls: Array.from(new Set(form.imageUrls)),
      priceCurrency: form.priceCurrency.trim().toUpperCase() || "THB",
    });
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= form.imageUrls.length || to >= form.imageUrls.length) return;
    setForm((prev) => {
      const next = [...prev.imageUrls];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return {
        ...prev,
        imageUrls: next,
        heroImageUrl: prev.heroImageUrl || next[0] || "",
      };
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? t("editTitle") : t("createTitle")} className="max-w-3xl">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                step >= idx ? "border-siam-blue bg-siam-blue text-white" : "border-gray-300 text-gray-500"
              }`}
            >
              {idx}
            </div>
          ))}
          <span className="ml-2 text-gray-500">{t("step", { current: step, total: totalSteps })}</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="sales-title">{t("fields.title")}</Label>
            <Input
              id="sales-title"
              value={form.title}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((p) => ({ ...p, title: value }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sales-make">{t("fields.make")}</Label>
            <Input
              id="sales-make"
              value={form.make}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((p) => ({ ...p, make: value }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sales-model">{t("fields.model")}</Label>
            <Input
              id="sales-model"
              value={form.model}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((p) => ({ ...p, model: value }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sales-year">{t("fields.year")}</Label>
            <Input
              id="sales-year"
              type="number"
              value={form.year}
              onChange={(e) => {
                const value = Number(e.currentTarget.value);
                setForm((p) => ({ ...p, year: value || p.year }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sales-mileage">{t("fields.mileage")}</Label>
            <Input
              id="sales-mileage"
              type="number"
              value={form.mileageKm}
              onChange={(e) => {
                const value = Number(e.currentTarget.value);
                setForm((p) => ({ ...p, mileageKm: Math.max(0, value || 0) }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sales-price">{t("fields.price")}</Label>
            <Input
              id="sales-price"
              type="number"
              value={form.priceAmount}
              onChange={(e) => {
                const value = Number(e.currentTarget.value);
                setForm((p) => ({ ...p, priceAmount: Math.max(0, value || 0) }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sales-category">{t("fields.category")}</Label>
            <Select
              id="sales-category"
              value={form.category}
              onChange={(e) => {
                const value = e.currentTarget.value as SalesListingInput["category"];
                setForm((p) => ({ ...p, category: value }));
              }}
            >
              <option value="car">{t("category.car")}</option>
              <option value="motorcycle">{t("category.motorcycle")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="sales-status">{t("fields.status")}</Label>
            <Select
              id="sales-status"
              value={form.status}
              onChange={(e) => {
                const value = e.currentTarget.value as SalesListingInput["status"];
                setForm((p) => ({ ...p, status: value }));
              }}
            >
              <option value="available">{t("status.available")}</option>
              <option value="reserved">{t("status.reserved")}</option>
              <option value="sold">{t("status.sold")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="sales-published">{t("fields.published")}</Label>
            <Select
              id="sales-published"
              value={form.published ? "1" : "0"}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((p) => ({ ...p, published: value === "1" }));
              }}
            >
              <option value="1">{t("yes")}</option>
              <option value="0">{t("no")}</option>
            </Select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="sales-images">{t("fields.images")}</Label>
            <Input id="sales-images" type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e.currentTarget.files)} />
            <p className="mt-1 text-xs text-gray-500">{t("uploadHint")}</p>
          </div>
          {form.imageUrls.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {form.imageUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex == null) return;
                    moveImage(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-xs dark:border-gray-700"
                >
                  <span className="truncate">{url}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant={form.heroImageUrl === url ? "default" : "outline"} onClick={() => setForm((p) => ({ ...p, heroImageUrl: url }))}>
                      {form.heroImageUrl === url ? t("hero") : t("setHero")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          imageUrls: p.imageUrls.filter((imageUrl) => imageUrl !== url),
                          heroImageUrl: p.heroImageUrl === url ? p.imageUrls.find((imageUrl) => imageUrl !== url) ?? "" : p.heroImageUrl,
                        }))
                      }
                    >
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-gray-500">{t("reorderHint")}</p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="sales-desc">{t("fields.description")}</Label>
            <textarea
              id="sales-desc"
              rows={5}
              value={form.description}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((p) => ({ ...p, description: value }));
              }}
              className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-sm font-medium">{t("fields.specifications")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder={t("specKeyPlaceholder")} value={specDraftKey} onChange={(e) => setSpecDraftKey(e.currentTarget.value)} />
              <Input placeholder={t("specValuePlaceholder")} value={specDraftValue} onChange={(e) => setSpecDraftValue(e.currentTarget.value)} />
              <Button type="button" variant="outline" onClick={addSpec}>
                {t("addSpec")}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {Object.entries(form.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
                  <span>
                    {key}: {value}
                  </span>
                  <button type="button" className="text-red-600" onClick={() => removeSpec(key)}>
                    {t("remove")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {formError ? <p className="mt-4 text-sm text-red-600">{formError}</p> : null}

      <div className="mt-5 flex items-center justify-between">
        <Button type="button" variant="outline" onClick={step === 1 ? onClose : () => setStep((s) => Math.max(1, s - 1))} disabled={disabled}>
          {step === 1 ? t("cancel") : t("back")}
        </Button>
        {step < totalSteps ? (
          <Button type="button" onClick={goNext} disabled={disabled}>
            {uploading ? t("uploading") : t("next")}
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={disabled}>
            {pending ? t("saving") : t("save")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
