"use client";

import { useRouter } from "@/i18n/navigation";
import { markListingEnquiryReadAction } from "@/actions/listing-enquiries";
import type { SellerListingEnquiryRow } from "@/data-access/listing-enquiries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function EnquiriesClient({ enquiries }: { enquiries: SellerListingEnquiryRow[] }) {
  const t = useTranslations("listingEnquiry");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function markRead(id: string) {
    setBusyId(id);
    try {
      await markListingEnquiryReadAction(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (enquiries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">
          {t("inboxEmpty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {enquiries.map((enquiry) => {
        const listingHref =
          enquiry.listingType === "vehicle"
            ? `/sales/${enquiry.listingId}`
            : `/real-estate/${enquiry.listingId}`;

        return (
          <Card key={enquiry.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {enquiry.listingTitle ?? t("unknownListing")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("fromBuyer", { name: enquiry.name, email: enquiry.email })}
                  </p>
                </div>
                <span
                  className={
                    enquiry.status === "new"
                      ? "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }
                >
                  {t(`status.${enquiry.status}` as "status.new")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {enquiry.message}
              </p>
              {enquiry.phone ? (
                <p className="text-xs text-gray-500">
                  {t("phone")}: {enquiry.phone}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={listingHref}>{t("viewListing")}</Link>
                </Button>
                {enquiry.status === "new" ? (
                  <Button
                    size="sm"
                    disabled={busyId === enquiry.id}
                    onClick={() => markRead(enquiry.id)}
                  >
                    {t("markRead")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
