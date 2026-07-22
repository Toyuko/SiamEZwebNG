"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SalesListingExportActions } from "@/components/sales/SalesListingExportActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  createSalesPropertyListing,
  deleteSalesPropertyListing,
  updateSalesPropertyListing,
} from "@/actions/real-estate";
import {
  RealEstateListingFormModal,
  type RealEstateListingInput,
} from "./real-estate-listing-form-modal";
import { useTranslations } from "next-intl";

type Listing = {
  id: string;
  title: string;
  propertyType: RealEstateListingInput["propertyType"];
  listingType: RealEstateListingInput["listingType"];
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
  sellerKind?: "dealer" | "private";
  status: RealEstateListingInput["status"];
  furnished: RealEstateListingInput["furnished"];
  published: boolean;
  isBoosted: boolean;
  boostExpiresAt?: Date | string | null;
  heroMediaType?: "image" | "video" | string;
  heroImageUrl: string;
  heroVideoUrl?: string | null;
  imageUrls: unknown;
  videoUrls: unknown;
  description: string;
  specifications: unknown;
};

function normalizeCurrency(currency: unknown) {
  if (typeof currency !== "string") return "THB";
  const normalized = currency.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "THB";
}

function toSafeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatPrice(amount: unknown, currency: unknown) {
  const safeAmount = toSafeNumber(amount);
  const safeCurrency = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toLocaleString("en-US")} ${safeCurrency}`;
  }
}

function statusClasses(status: Listing["status"]) {
  if (status === "available") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (status === "reserved") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (status === "pending_boost")
    return "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200";
  return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function normalizeForForm(listing: Listing): RealEstateListingInput {
  return {
    title: listing.title,
    propertyType: listing.propertyType,
    listingType: listing.listingType,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    areaSqm: listing.areaSqm,
    landAreaSqm: listing.landAreaSqm,
    floor: listing.floor,
    yearBuilt: listing.yearBuilt,
    province: listing.province,
    district: listing.district,
    neighborhood: listing.neighborhood,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    sellerKind: listing.sellerKind === "dealer" ? "dealer" : "private",
    status: listing.status,
    furnished: listing.furnished,
    heroMediaType: listing.heroMediaType === "video" ? "video" : "image",
    heroImageUrl: listing.heroImageUrl,
    heroVideoUrl: typeof listing.heroVideoUrl === "string" ? listing.heroVideoUrl : null,
    imageUrls: Array.isArray(listing.imageUrls)
      ? listing.imageUrls.filter((url): url is string => typeof url === "string")
      : [listing.heroImageUrl],
    videoUrls: Array.isArray(listing.videoUrls)
      ? listing.videoUrls.filter((url): url is string => typeof url === "string")
      : [],
    description: listing.description,
    specifications:
      listing.specifications && typeof listing.specifications === "object"
        ? (listing.specifications as Record<string, string>)
        : {},
    published: listing.published,
    isBoosted: Boolean(listing.isBoosted),
  };
}

export function RealEstateDashboardClient({ initialListings }: { initialListings: Listing[] }) {
  const t = useTranslations("realEstateAdmin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const listings = useMemo(() => initialListings, [initialListings]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (listing: Listing) => {
    setEditing(listing);
    setFormOpen(true);
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(t("confirmDelete", { label }))) return;
    startTransition(async () => {
      await deleteSalesPropertyListing(id);
      router.refresh();
    });
  };

  const handleStatusChange = (listing: Listing, nextStatus: Listing["status"]) => {
    startTransition(async () => {
      await updateSalesPropertyListing(listing.id, {
        ...normalizeForForm(listing),
        status: nextStatus,
      });
      router.refresh();
    });
  };

  const handleSubmit = (data: RealEstateListingInput) => {
    startTransition(async () => {
      if (editing) {
        await updateSalesPropertyListing(editing.id, data);
      } else {
        await createSalesPropertyListing(data);
      }
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("addListing")}
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                  <th className="px-4 py-3 font-medium">{t("table.listing")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.type")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.price")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.details")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="min-w-[10rem] px-4 py-3 font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{listing.title}</p>
                      <p className="text-xs text-gray-500">
                        {[listing.district, listing.province].filter(Boolean).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{t(`propertyType.${listing.propertyType}`)}</p>
                      <p className="text-xs text-gray-500">{t(`listingType.${listing.listingType}`)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {formatPrice(listing.priceAmount, listing.priceCurrency)}
                    </td>
                    <td className="px-4 py-3">
                      {listing.bedrooms ?? "—"} bed · {toSafeNumber(listing.areaSqm).toLocaleString()}{" "}
                      m²
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses(listing.status)}`}
                        >
                          {t(`status.${listing.status}`)}
                        </span>
                        <Select
                          className="h-8 w-32"
                          value={listing.status}
                          onChange={(e) =>
                            handleStatusChange(
                              listing,
                              e.currentTarget.value as Listing["status"]
                            )
                          }
                          disabled={pending}
                        >
                          <option value="available">{t("status.available")}</option>
                          <option value="reserved">{t("status.reserved")}</option>
                          <option value="sold">{t("status.sold")}</option>
                          <option value="pending_boost">{t("status.pending_boost")}</option>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <SalesListingExportActions
                          listing={{
                            title: listing.title,
                            heroImageUrl: listing.heroImageUrl,
                            imageUrls: listing.imageUrls,
                            description: listing.description,
                          }}
                          translationNamespace="realEstateAdmin"
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(listing)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(listing.id, listing.title)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listings.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">{t("empty")}</div>
          ) : null}
        </CardContent>
      </Card>

      <RealEstateListingFormModal
        open={formOpen}
        onClose={() => {
          if (pending) return;
          setFormOpen(false);
          setEditing(null);
        }}
        initialData={editing ? normalizeForForm(editing) : null}
        onSubmit={handleSubmit}
        pending={pending}
      />
    </>
  );
}
