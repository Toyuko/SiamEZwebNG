"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { createSalesListing, deleteSalesListing, updateSalesListing } from "@/actions/sales";
import { SalesListingFormModal, type SalesListingInput } from "./sales-listing-form-modal";
import { useTranslations } from "next-intl";

type Listing = {
  id: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceAmount: number;
  priceCurrency: string;
  category: "car" | "motorcycle";
  status: "available" | "reserved" | "sold";
  published: boolean;
  heroImageUrl: string;
  imageUrls: unknown;
  description: string;
  title: string;
  specifications: unknown;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount / 100
  );
}

function statusClasses(status: Listing["status"]) {
  if (status === "available") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (status === "reserved") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function normalizeForForm(listing: Listing): SalesListingInput {
  return {
    title: listing.title,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    mileageKm: listing.mileageKm,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    category: listing.category,
    status: listing.status,
    heroImageUrl: listing.heroImageUrl,
    imageUrls: Array.isArray(listing.imageUrls)
      ? listing.imageUrls.filter((url): url is string => typeof url === "string")
      : [listing.heroImageUrl],
    description: listing.description,
    specifications:
      listing.specifications && typeof listing.specifications === "object" ? (listing.specifications as Record<string, string>) : {},
    published: listing.published,
  };
}

export function SalesDashboardClient({ initialListings }: { initialListings: Listing[] }) {
  const t = useTranslations("salesAdmin");
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
      await deleteSalesListing(id);
      router.refresh();
    });
  };

  const handleStatusChange = (listing: Listing, nextStatus: Listing["status"]) => {
    startTransition(async () => {
      await updateSalesListing(listing.id, { ...normalizeForForm(listing), status: nextStatus });
      router.refresh();
    });
  };

  const handleSubmit = (data: SalesListingInput) => {
    startTransition(async () => {
      if (editing) {
        await updateSalesListing(editing.id, data);
      } else {
        await createSalesListing(data);
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
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t("subtitle")}
          </p>
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
                  <th className="px-4 py-3 font-medium">{t("table.category")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.price")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.yearMileage")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="w-28 px-4 py-3 font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{listing.make} {listing.model}</p>
                      <p className="text-xs text-gray-500">{listing.title}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{t(`category.${listing.category}`)}</td>
                    <td className="px-4 py-3">{formatPrice(listing.priceAmount, listing.priceCurrency)}</td>
                    <td className="px-4 py-3">
                      {listing.year} / {listing.mileageKm.toLocaleString()} km
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses(listing.status)}`}>
                          {t(`status.${listing.status}`)}
                        </span>
                        <Select
                          className="h-8 w-32"
                          value={listing.status}
                          onChange={(e) => handleStatusChange(listing, e.currentTarget.value as Listing["status"])}
                          disabled={pending}
                        >
                          <option value="available">{t("status.available")}</option>
                          <option value="reserved">{t("status.reserved")}</option>
                          <option value="sold">{t("status.sold")}</option>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(listing)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(listing.id, `${listing.make} ${listing.model}`)}>
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

      <SalesListingFormModal
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
