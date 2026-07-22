"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export type RealEstateListingInput = {
  title: string;
  propertyType: "condo" | "house" | "townhouse" | "land" | "commercial" | "villa";
  listingType: "sale" | "rent";
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number;
  landAreaSqm: number | null;
  floor: number | null;
  yearBuilt: number | null;
  province: string;
  district: string | null;
  neighborhood: string | null;
  priceAmount: number;
  priceCurrency: string;
  sellerKind: "dealer" | "private";
  status: "available" | "reserved" | "sold" | "pending_boost";
  furnished: "unfurnished" | "partially" | "furnished" | "not_applicable";
  heroMediaType: "image" | "video";
  heroImageUrl: string;
  heroVideoUrl: string | null;
  imageUrls: string[];
  videoUrls: string[];
  description: string;
  specifications: Record<string, string>;
  published: boolean;
  isBoosted: boolean;
};

const EMPTY_FORM: RealEstateListingInput = {
  title: "",
  propertyType: "condo",
  listingType: "sale",
  bedrooms: 1,
  bathrooms: 1,
  areaSqm: 50,
  landAreaSqm: null,
  floor: null,
  yearBuilt: null,
  province: "Bangkok",
  district: null,
  neighborhood: null,
  priceAmount: 0,
  priceCurrency: "THB",
  sellerKind: "private",
  status: "available",
  furnished: "not_applicable",
  heroMediaType: "image",
  heroImageUrl: "",
  heroVideoUrl: null,
  imageUrls: [],
  videoUrls: [],
  description: "",
  specifications: {},
  published: true,
  isBoosted: false,
};

export function RealEstateListingFormModal({
  open,
  onClose,
  initialData,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  initialData: RealEstateListingInput | null;
  onSubmit: (data: RealEstateListingInput) => void;
  pending: boolean;
}) {
  const t = useTranslations("realEstateAdminForm");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RealEstateListingInput>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [specDraftKey, setSpecDraftKey] = useState("");
  const [specDraftValue, setSpecDraftValue] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [imageUrlDraft, setImageUrlDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormError("");
    setSpecDraftKey("");
    setSpecDraftValue("");
    setDragIndex(null);
    setDragOverIndex(null);
    setImageUrlDraft("");
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
      specifications: { ...prev.specifications, [key]: value },
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

  const handleImageUpload = async (files: FileList | null) => {
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
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || t("errors.uploadFailed"));
        }
        const json = (await res.json()) as { url?: string };
        if (json.url) uploadedUrls.push(json.url);
      }
      setForm((prev) => {
        const merged = Array.from(new Set([...prev.imageUrls, ...uploadedUrls]));
        return {
          ...prev,
          imageUrls: merged,
          heroMediaType: prev.heroImageUrl || prev.heroVideoUrl ? prev.heroMediaType : "image",
          heroImageUrl: prev.heroImageUrl || merged[0] || "",
          heroVideoUrl: prev.heroImageUrl || prev.heroVideoUrl ? prev.heroVideoUrl : null,
        };
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
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
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || t("errors.uploadFailed"));
        }
        const json = (await res.json()) as { url?: string };
        if (json.url) uploadedUrls.push(json.url);
      }
      setForm((prev) => ({
        ...prev,
        videoUrls: Array.from(new Set([...prev.videoUrls, ...uploadedUrls])),
        heroMediaType: prev.heroImageUrl || prev.heroVideoUrl ? prev.heroMediaType : "video",
        heroVideoUrl: prev.heroImageUrl || prev.heroVideoUrl ? prev.heroVideoUrl : uploadedUrls[0] ?? null,
      }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim() || !form.province.trim()) return t("errors.step1Required");
      if (form.priceAmount <= 0) return t("errors.priceInvalid");
      if (form.areaSqm < 1) return t("errors.areaInvalid");
      return "";
    }
    if (step === 2) {
      if (form.imageUrls.length === 0 && form.videoUrls.length === 0) return t("errors.mediaRequired");
      if (form.heroMediaType === "video") {
        if (!form.heroVideoUrl) return t("errors.heroRequired");
      } else if (!form.heroImageUrl) {
        return t("errors.heroRequired");
      }
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

  const pickFallbackHero = (nextImages: string[], nextVideos: string[]) => {
    if (nextImages.length > 0) {
      return { heroMediaType: "image" as const, heroImageUrl: nextImages[0], heroVideoUrl: null };
    }
    if (nextVideos.length > 0) {
      return { heroMediaType: "video" as const, heroImageUrl: "", heroVideoUrl: nextVideos[0] };
    }
    return { heroMediaType: "image" as const, heroImageUrl: "", heroVideoUrl: null };
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= form.imageUrls.length || to >= form.imageUrls.length)
      return;
    setForm((prev) => {
      const next = [...prev.imageUrls];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return {
        ...prev,
        imageUrls: next,
        heroImageUrl: prev.heroImageUrl && next.includes(prev.heroImageUrl) ? prev.heroImageUrl : next[0] || "",
      };
    });
  };

  const addImageUrlsFromDraft = () => {
    const draftUrls = imageUrlDraft
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    if (draftUrls.length === 0) return;
    setForm((prev) => {
      const merged = Array.from(new Set([...prev.imageUrls, ...draftUrls]));
      return {
        ...prev,
        imageUrls: merged,
        heroMediaType: prev.heroImageUrl || prev.heroVideoUrl ? prev.heroMediaType : "image",
        heroImageUrl: prev.heroImageUrl || merged[0] || "",
        heroVideoUrl: prev.heroImageUrl || prev.heroVideoUrl ? prev.heroVideoUrl : null,
      };
    });
    setImageUrlDraft("");
  };

  const submit = () => {
    const err = validateStep();
    setFormError(err);
    if (err) return;
    const normalizedImageUrls = Array.from(new Set(form.imageUrls));
    const normalizedVideoUrls = Array.from(
      new Set(form.videoUrls.map((url) => url.trim()).filter(Boolean))
    );
    const heroMediaType =
      (form.heroMediaType === "video" && form.heroVideoUrl && normalizedVideoUrls.includes(form.heroVideoUrl)) ||
      (normalizedImageUrls.length === 0 && normalizedVideoUrls.length > 0)
        ? "video"
        : "image";
    const heroVideoUrl =
      heroMediaType === "video"
        ? form.heroVideoUrl && normalizedVideoUrls.includes(form.heroVideoUrl)
          ? form.heroVideoUrl
          : normalizedVideoUrls[0] ?? null
        : null;
    const heroImageUrl =
      heroMediaType === "image"
        ? form.heroImageUrl || normalizedImageUrls[0] || ""
        : normalizedImageUrls[0] || form.heroImageUrl || heroVideoUrl || "";
    onSubmit({
      ...form,
      title: form.title.trim(),
      province: form.province.trim(),
      district: form.district?.trim() || null,
      neighborhood: form.neighborhood?.trim() || null,
      description: form.description.trim(),
      heroMediaType,
      heroImageUrl,
      heroVideoUrl,
      imageUrls: normalizedImageUrls,
      videoUrls: normalizedVideoUrls,
      priceCurrency: form.priceCurrency.trim().toUpperCase() || "THB",
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? t("editTitle") : t("createTitle")}
      className="max-w-3xl"
    >
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                step >= idx
                  ? "border-siam-blue bg-siam-blue text-white"
                  : "border-gray-300 text-gray-500"
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
            <Label htmlFor="re-title">{t("fields.title")}</Label>
            <Input
              id="re-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.currentTarget.value }))}
            />
          </div>
          <div>
            <Label htmlFor="re-property-type">{t("fields.propertyType")}</Label>
            <Select
              id="re-property-type"
              value={form.propertyType}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  propertyType: e.currentTarget.value as RealEstateListingInput["propertyType"],
                }))
              }
            >
              <option value="condo">{t("propertyType.condo")}</option>
              <option value="house">{t("propertyType.house")}</option>
              <option value="townhouse">{t("propertyType.townhouse")}</option>
              <option value="land">{t("propertyType.land")}</option>
              <option value="commercial">{t("propertyType.commercial")}</option>
              <option value="villa">{t("propertyType.villa")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="re-listing-type">{t("fields.listingType")}</Label>
            <Select
              id="re-listing-type"
              value={form.listingType}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  listingType: e.currentTarget.value as RealEstateListingInput["listingType"],
                }))
              }
            >
              <option value="sale">{t("listingType.sale")}</option>
              <option value="rent">{t("listingType.rent")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="re-price">{t("fields.price")}</Label>
            <Input
              id="re-price"
              type="number"
              value={form.priceAmount}
              onChange={(e) =>
                setForm((p) => ({ ...p, priceAmount: Math.max(0, Number(e.currentTarget.value) || 0) }))
              }
            />
          </div>
          <div>
            <Label htmlFor="re-area">{t("fields.areaSqm")}</Label>
            <Input
              id="re-area"
              type="number"
              value={form.areaSqm}
              onChange={(e) =>
                setForm((p) => ({ ...p, areaSqm: Math.max(1, Number(e.currentTarget.value) || 1) }))
              }
            />
          </div>
          <div>
            <Label htmlFor="re-beds">{t("fields.bedrooms")}</Label>
            <Input
              id="re-beds"
              type="number"
              value={form.bedrooms ?? ""}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                setForm((p) => ({
                  ...p,
                  bedrooms: raw === "" ? null : Math.max(0, Number(raw) || 0),
                }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="re-baths">{t("fields.bathrooms")}</Label>
            <Input
              id="re-baths"
              type="number"
              value={form.bathrooms ?? ""}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                setForm((p) => ({
                  ...p,
                  bathrooms: raw === "" ? null : Math.max(0, Number(raw) || 0),
                }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="re-land">{t("fields.landAreaSqm")}</Label>
            <Input
              id="re-land"
              type="number"
              value={form.landAreaSqm ?? ""}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                setForm((p) => ({
                  ...p,
                  landAreaSqm: raw === "" ? null : Math.max(0, Number(raw) || 0),
                }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="re-floor">{t("fields.floor")}</Label>
            <Input
              id="re-floor"
              type="number"
              value={form.floor ?? ""}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                setForm((p) => ({
                  ...p,
                  floor: raw === "" ? null : Math.max(0, Number(raw) || 0),
                }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="re-year">{t("fields.yearBuilt")}</Label>
            <Input
              id="re-year"
              type="number"
              value={form.yearBuilt ?? ""}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                setForm((p) => ({
                  ...p,
                  yearBuilt: raw === "" ? null : Number(raw) || null,
                }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="re-furnished">{t("fields.furnished")}</Label>
            <Select
              id="re-furnished"
              value={form.furnished}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  furnished: e.currentTarget.value as RealEstateListingInput["furnished"],
                }))
              }
            >
              <option value="not_applicable">{t("furnished.not_applicable")}</option>
              <option value="unfurnished">{t("furnished.unfurnished")}</option>
              <option value="partially">{t("furnished.partially")}</option>
              <option value="furnished">{t("furnished.furnished")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="re-province">{t("fields.province")}</Label>
            <Input
              id="re-province"
              value={form.province}
              onChange={(e) => setForm((p) => ({ ...p, province: e.currentTarget.value }))}
            />
          </div>
          <div>
            <Label htmlFor="re-district">{t("fields.district")}</Label>
            <Input
              id="re-district"
              value={form.district ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, district: e.currentTarget.value || null }))
              }
            />
          </div>
          <div>
            <Label htmlFor="re-neighborhood">{t("fields.neighborhood")}</Label>
            <Input
              id="re-neighborhood"
              value={form.neighborhood ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, neighborhood: e.currentTarget.value || null }))
              }
            />
          </div>
          <div>
            <Label htmlFor="re-seller">{t("fields.sellerKind")}</Label>
            <Select
              id="re-seller"
              value={form.sellerKind}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  sellerKind: e.currentTarget.value as RealEstateListingInput["sellerKind"],
                }))
              }
            >
              <option value="private">{t("sellerKind.private")}</option>
              <option value="dealer">{t("sellerKind.dealer")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="re-status">{t("fields.status")}</Label>
            <Select
              id="re-status"
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status: e.currentTarget.value as RealEstateListingInput["status"],
                }))
              }
            >
              <option value="available">{t("status.available")}</option>
              <option value="reserved">{t("status.reserved")}</option>
              <option value="sold">{t("status.sold")}</option>
              <option value="pending_boost">{t("status.pending_boost")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="re-published">{t("fields.published")}</Label>
            <Select
              id="re-published"
              value={form.published ? "1" : "0"}
              onChange={(e) => setForm((p) => ({ ...p, published: e.currentTarget.value === "1" }))}
            >
              <option value="1">{t("yes")}</option>
              <option value="0">{t("no")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="re-boosted">{t("fields.isBoosted")}</Label>
            <Select
              id="re-boosted"
              value={form.isBoosted ? "1" : "0"}
              onChange={(e) => setForm((p) => ({ ...p, isBoosted: e.currentTarget.value === "1" }))}
            >
              <option value="0">{t("no")}</option>
              <option value="1">{t("yes")}</option>
            </Select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="re-images">{t("fields.images")}</Label>
            <Input
              id="re-images"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleImageUpload(e.currentTarget.files)}
            />
            <p className="mt-1 text-xs text-gray-500">{t("uploadHint")}</p>
          </div>
          <div>
            <Label htmlFor="re-image-urls">{t("fields.imageUrls")}</Label>
            <textarea
              id="re-image-urls"
              rows={3}
              value={imageUrlDraft}
              onChange={(e) => setImageUrlDraft(e.currentTarget.value)}
              placeholder={t("imageUrlsPlaceholder")}
              className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">{t("imageUrlHint")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={addImageUrlsFromDraft}
                disabled={!imageUrlDraft.trim()}
              >
                {t("addImageUrls")}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="re-videos-upload">{t("fields.uploadVideos")}</Label>
            <Input
              id="re-videos-upload"
              type="file"
              multiple
              accept="video/*"
              onChange={(e) => handleVideoUpload(e.currentTarget.files)}
            />
            <p className="mt-1 text-xs text-gray-500">{t("uploadVideoHint")}</p>
          </div>
          <div>
            <Label htmlFor="re-video-urls">{t("fields.videos")}</Label>
            <textarea
              id="re-video-urls"
              rows={3}
              value={form.videoUrls.join("\n")}
              onChange={(e) => {
                const urls = e.currentTarget.value
                  .split(/\r?\n/)
                  .map((url) => url.trim())
                  .filter(Boolean);
                setForm((p) => ({
                  ...p,
                  heroMediaType: !p.heroImageUrl && !p.heroVideoUrl && urls[0] ? "video" : p.heroMediaType,
                  heroVideoUrl: !p.heroImageUrl && !p.heroVideoUrl && urls[0] ? urls[0] : p.heroVideoUrl,
                  videoUrls: urls,
                }));
              }}
              placeholder={t("videoUrlsPlaceholder")}
              className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">{t("videoHint")}</p>
          </div>
          {form.imageUrls.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {form.imageUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(idx);
                  }}
                  onDragLeave={() => setDragOverIndex((prev) => (prev === idx ? null : prev))}
                  onDrop={() => {
                    if (dragIndex == null) return;
                    moveImage(dragIndex, idx);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`space-y-2 rounded-lg border p-2 text-xs transition ${
                    dragOverIndex === idx
                      ? "border-siam-blue bg-siam-blue/5"
                      : "border-gray-200 dark:border-gray-700"
                  } ${dragIndex === idx ? "cursor-grabbing opacity-70" : "cursor-grab"}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                    <Image
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        form.heroMediaType === "image" && form.heroImageUrl === url
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          heroMediaType: "image",
                          heroImageUrl: url,
                          heroVideoUrl: null,
                        }))
                      }
                    >
                      {form.heroMediaType === "image" && form.heroImageUrl === url
                        ? t("hero")
                        : t("setHero")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((p) => {
                          const nextImages = p.imageUrls.filter((_, index) => index !== idx);
                          return {
                            ...p,
                            ...pickFallbackHero(nextImages, p.videoUrls),
                            imageUrls: nextImages,
                          };
                        })
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
            <Label htmlFor="re-desc">{t("fields.description")}</Label>
            <textarea
              id="re-desc"
              rows={5}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.currentTarget.value }))}
              className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-sm font-medium">{t("fields.specifications")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                placeholder={t("specKeyPlaceholder")}
                value={specDraftKey}
                onChange={(e) => setSpecDraftKey(e.currentTarget.value)}
              />
              <Input
                placeholder={t("specValuePlaceholder")}
                value={specDraftValue}
                onChange={(e) => setSpecDraftValue(e.currentTarget.value)}
              />
              <Button type="button" variant="outline" onClick={addSpec}>
                {t("addSpec")}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {Object.entries(form.specifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
                >
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
        <Button
          type="button"
          variant="outline"
          onClick={step === 1 ? onClose : () => setStep((s) => Math.max(1, s - 1))}
          disabled={disabled}
        >
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
